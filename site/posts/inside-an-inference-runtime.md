---
title: Inside a modern LLM inference runtime
description: How vLLM turns requests into GPU work through continuous batching, KV-cache paging, and token scheduling.
date: 2026-11-01
category: ML
slug: inside-an-inference-runtime
draft: false
---

A model can fit on a GPU and still make a poor service. A short question arrives behind a long document. Several users are halfway through their responses. New requests keep coming. Each wants a fast first token and a steady stream after it.

The runtime has to turn that traffic into bounded, useful work. This post follows the core ideas in vLLM’s V1 architecture for autoregressive transformer inference. The examples are deliberately small; they explain the mechanics, not measured performance. Exact policies and defaults depend on the version, model, and hardware.

[TOC]

## Two workloads share one GPU

Generation has two different shapes:

| Phase | Work | Common constraint |
| --- | --- | --- |
| Prefill | Process the prompt and build attention state; the final prompt position can produce the first output token. | Compute, especially for substantial prompts. |
| Decode | Process the latest token using the cached state to produce the next one. | Memory bandwidth, particularly at small batch sizes. |

These are tendencies, not fixed classifications. Batch size, context length, model architecture, and hardware change the balance. The key-value cache, or **KV cache**, retains earlier attention keys and values so generation can reuse them.

In an online engine, continuous batching lets the set of requests change between execution steps. A finished request can leave and a new one can join without waiting for an entire fixed batch to finish. The engine repeatedly schedules work, runs the model, and updates request state, including stop conditions and resource release. The vLLM team’s [engine walkthrough](https://vllm-project.github.io/2025/09/05/anatomy-of-vllm.html) follows this cycle in detail.

## The runtime is a pipeline

vLLM V1 separates the HTTP-facing API server, the engine core, and GPU workers into processes. The API server prepares inputs and streams results. The engine core owns scheduling and KV-cache coordination. Workers hold the model weights and execute the selected work on their GPUs. See the [architecture overview](https://docs.vllm.ai/en/latest/design/arch_overview/).

<figure class="article-flow">
  <ol>
    <li><span class="flow-step">01 / INPUT</span><strong>API server</strong><span>Request processing<br>Tokenization</span></li>
    <li><span class="flow-step">02 / CONTROL</span><strong>Engine core</strong><span>Token scheduling<br>KV-cache allocation</span></li>
    <li><span class="flow-step">03 / EXECUTION</span><strong>GPU workers</strong><span>Model forward pass<br>Generated tokens</span></li>
  </ol>
  <figcaption>Work moves toward the workers; generated output returns through the server to the client. This diagram omits parallel deployment topology.</figcaption>
</figure>

This gives me a useful order for investigating latency: locate the delay before changing the model execution settings. Is the request still being prepared, waiting for admission, or already running? A faster kernel only helps time spent in that kernel.

## Schedule tokens, then check memory

V1 frames scheduling around a token budget. Requests track how much work has already been computed, and a step assigns additional tokens across requests. Prefill and decode remain useful descriptions of the workload, but they do not require two separate scheduler loops. The [V1 guide](https://docs.vllm.ai/en/latest/usage/v1_guide/) explains this unified representation.

Consider an illustrative budget of six token positions per step. Requests A and B each need one ordinary decode position; C has a ten-token prompt waiting to be processed.

```text
Step 1   A: decode 1   B: decode 1   C: prefill 4   total: 6
Step 2   A: decode 1   B: decode 1   C: prefill 4   total: 6
Step 3   A: decode 1   B: decode 1   C: prefill 2   total: 4
```

Assume A and B keep generating, cache capacity is available, and speculative decoding is off. C’s prompt completes in the third step. A scheduler budget counts token positions, not equal units of execution time; a decode position attending to a long context can cost more than one attending to a short context.

This is the motivation for **chunked prefill**. vLLM can split a long prompt across steps and mix those pieces with ongoing decodes. Its documented policy prioritizes decode work and uses remaining token capacity for prefill. The token budget is only one limit: selected requests also need KV-cache space. Under cache pressure, V1 can preempt work and later recompute it. The [tuning guide](https://docs.vllm.ai/en/latest/configuration/optimization/) describes both behaviors.

## Give the KV cache a page table

A growing sequence needs a growing amount of attention state. Reserving a large contiguous allocation for every possible output wastes space; variable request lifetimes make allocation harder still.

PagedAttention divides this state into blocks. A request sees a logical sequence of blocks, while a block table identifies where those blocks live in the physical cache. Neighboring logical blocks need not occupy neighboring physical slots. The [PagedAttention paper](https://arxiv.org/abs/2309.06180) develops this memory-management approach.

For example, with an illustrative four-token block size:

| Logical block | Token positions | Physical cache block |
| --- | --- | --- |
| 0 | 0–3 | 7 |
| 1 | 4–7 | 2 |
| 2 | 8–11 | 11 |

The mapping is the important part. Allocation can grow a request block by block instead of reserving one maximum-sized contiguous region. A final partially filled block still has unused space. This is a runtime-managed mapping for attention, inspired by virtual memory; it does not mean every generated token triggers an operating-system page fault.

## Reuse a prefix, not an answer

Prefix caching reuses KV blocks from a compatible previously computed prompt prefix. Repeated context can therefore avoid repeated prefill work. It does not turn a new generation into a cached response.

vLLM identifies reusable blocks with hashes that incorporate the preceding prefix, the block’s tokens, and relevant additional identity such as adapter information. Its design caches full blocks; matching a handful of words somewhere inside two prompts is insufficient. The shared history matters. The [prefix-caching design](https://docs.vllm.ai/en/latest/design/prefix_caching/) also describes cache salts for controlling reuse between requests.

## Measure the service you want

I would start a tuning experiment with a fixed model revision, runtime version, GPU configuration, prompt-length distribution, output-length distribution, and arrival pattern. I would record the cache warm-up conditions too. Otherwise, two throughput numbers may describe different workloads.

For each offered load, I would inspect:

- **Time to first token:** how long a request waits before output begins.
- **Inter-token latency:** the gaps while output is streaming.
- **End-to-end latency:** when the complete response finishes.
- **Output tokens per second:** useful throughput, paired with latency percentiles and error counts.

vLLM exposes timing histograms, queue information, and cache-related metrics in its [metrics interface](https://docs.vllm.ai/en/latest/design/metrics/). Keep measurement boundaries explicit: server-side timings do not describe every client-side network delay. Its inter-token metric can also cover an output containing multiple tokens, so it is not interchangeable with a per-request average time per output token.

Then vary one resource limit. A smaller batched-token budget can reduce how much prefill work sits alongside decoding; a larger one can move prompts through sooner. Those are tradeoffs to measure under the intended load, not universal settings. Cache pressure and recomputation belong in the same investigation. The [optimization guide](https://docs.vllm.ai/en/latest/configuration/optimization/) provides the relevant controls.

## The useful question

When a request is slow, I want to know **what it is waiting for**: input processing, scheduler admission, cache capacity, or execution. That question connects the user-visible delay to a part of the runtime that can actually be inspected.

The model defines the computation. Serving it well also requires deciding when that computation runs, which requests share a step, and how their state stays resident as traffic changes.
