# Presentation deck

### Theory of Computation (2025) · Final Project · NCKU CSIE

The slides as presented in class. The four that carry the design — the module
dependency graph, the endpoint state machine, the attachment quadrant and the
Gottman table — are reproduced in the [README](../README.md) alongside the text
that explains them; this file is the complete deck, including the framing slides
that the README does not need.

---

## 1. Title

<img alt="Title slide: AI Relationship Analyst Agent"
     src="https://github.com/user-attachments/assets/2faadec8-b292-4efe-9986-2f0a9ef9df3f" width="880">

## 2. Outline

<img alt="Outline"
     src="https://github.com/user-attachments/assets/4873b009-9bfd-4c17-ab01-47c6df17e985" width="880">

## 3–4. Agent description

<img alt="Agent description, capabilities"
     src="https://github.com/user-attachments/assets/287836d4-c813-4ed9-a26d-bb96e579f143" width="880">

<img alt="Agent description, processing steps"
     src="https://github.com/user-attachments/assets/36647b67-f16d-4bf5-b7e7-f85970101866" width="880">

> These two slides describe the agent as selecting between an analysis tool and
> a conflict-mining tool. It does not: see §8 of the README. The slides are
> reproduced as presented rather than corrected.

## 5. Flow chart — module dependency graph

<img alt="Module dependency graph"
     src="https://github.com/user-attachments/assets/366e0dfc-98af-49bc-ac4d-3d6fc5a334d1" width="880">

*Discussed as Figure 3 in [§4 of the README](../README.md#4-system-architecture).*

## 6. FSM over the HTTP endpoints

<img alt="Session state machine"
     src="https://github.com/user-attachments/assets/0a4808c7-b16f-498e-ae93-6a9507aa2386" width="880">

*Discussed as Figure 4 in
[§5 of the README](../README.md#5-the-web-layer-is-a-second-state-machine).*

## 7. Core concept — attachment theory

<img alt="Attachment theory quadrant"
     src="https://github.com/user-attachments/assets/892512b4-72ae-49a1-a0e2-a6a387e649dc" width="880">

## 8. Core concept — Gottman's four horsemen

<img alt="Gottman's four horsemen"
     src="https://github.com/user-attachments/assets/f40bd4f6-f7b5-4992-a288-72312aa1abe2" width="880">

*Both discussed in [§6 of the README](../README.md#6-the-domain-model).*

---

## Deployment note

The demo is on Render's free tier and sleeps after 15 minutes of inactivity.
The first request after a sleep shows this while the container wakes, for
roughly 30–60 seconds:

<img alt="Render cold-start screen"
     src="https://github.com/user-attachments/assets/276a33e9-c9dd-43e8-8ba8-ee7654889bc9" width="880">

---

## Case study — withheld

The deck ended with eight case-study slides walking through a complete generated
report. That report was produced from a real conversation between real, named
people, and is the same content as the `web_reports/` files that were removed
from this repository (README §8). They are therefore not reproduced here.

They can be restored by whoever the conversation belongs to, if they want them
restored; the eight asset URLs are preserved in the source of this file so that
restoring them is a one-line edit rather than a reconstruction.

<!--
Case study slides, withheld pending consent from the people named in them:
  https://github.com/user-attachments/assets/eb94fcfc-ebf1-4a01-a281-7a2b58fc0130
  https://github.com/user-attachments/assets/202f114c-abb7-4081-9a23-a438ec2ff104
  https://github.com/user-attachments/assets/6c0c2ae8-90d0-4ce2-8971-2907b04f3e8d
  https://github.com/user-attachments/assets/929ce67b-bf7d-45ea-932a-a247361b8d9b
  https://github.com/user-attachments/assets/b89de1cb-48e2-45ae-afcc-a67a57302adf
  https://github.com/user-attachments/assets/7a56de81-ca26-45cc-9778-8d969d6bd1ee
  https://github.com/user-attachments/assets/af46d795-cd4b-4558-a1a6-15366542dc86
  https://github.com/user-attachments/assets/ac1160d5-0cb0-47d0-abab-eff7400c240a
-->

A synthetic walkthrough, using an invented conversation, would make the same
point about the output format without the disclosure, and is the right way to
put this section back.
