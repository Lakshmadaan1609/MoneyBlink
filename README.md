# BlinkMoney Future

## A behavioral wealth engine for daily investing consistency

## Assignment objective

This project is built as a response to the BlinkMoney Frontend Engineering Assignment.

The goal is not to redesign the entire app, but to create a **genuinely new feature that can meaningfully improve user engagement, retention, and investing consistency**.

Instead of focusing on portfolio tracking, this project focuses on **behavioral wealth building**.

---

# Understanding BlinkMoney

## What BlinkMoney already has

BlinkMoney already solves a powerful financial problem.

### Core product capabilities

* Daily investing from ₹21/day
* Automatic diversification across multiple assets
* Zero lock-in
* Liquidity through borrowing against investments
* Continued compounding while accessing cash
* Simple long-term wealth creation

Their core product model is:

**Invest → Grow → Borrow → Still Grow**

This is a strong financial infrastructure.

---

# What the assignment is asking

The assessment asks candidates to build a **new feature or a tectonic improvement** that could significantly improve:

* Engagement
* Referral
* Wealth gamification
* Virality
* User retention

This project is designed specifically around **retention and daily engagement**.

---

# The problem

Most investment apps are opened occasionally.

Users do not feel daily progress because compounding is invisible.

As a result:

* SIPs get paused
* Consistency breaks
* Long-term goals feel distant
* Emotional connection with wealth creation is weak

BlinkMoney helps users build wealth.

This project helps users **fall in love with building wealth**.

---

# Product thesis

People protect **identity more than money**.

FutureOS transforms BlinkMoney into a daily financial companion by making the future visible and emotionally rewarding.

The product is designed around one question:

> **"Did I make tomorrow better today?"**

---

# What we are building

## FutureOS

A connected behavioral wealth system that introduces identity, consistency, and future visualization.

---

# Feature 1: Story-based onboarding

## Purpose

Create emotional connection before financial interaction.

Instead of asking users to simply create an account, the app introduces a future version of themselves.

The onboarding will be built around a **short story-driven experience** where the user meets their Future Self.

### Planned flow

* Choose who you are building wealth for
* Meet your Future You
* Create your first financial identity
* Begin your wealth journey

The story script is intentionally left open and will be developed separately.

---

# Feature 2: Future You avatar

## Purpose

Build identity and emotional attachment.

The avatar evolves as the user remains financially consistent.

### Progress representation

* Dream home
* Dream car
* Emergency fund
* Family security
* Financial freedom

The avatar is not decorative.

It is a visual representation of the user's future.

---

# Feature 3: Wealth Streak

## Purpose

Increase daily retention.

Users earn consistency milestones.

### Milestones

* 7 days
* 30 days
* 100 days
* 365 days

The streak becomes a behavioral anchor.

Breaking the streak should feel meaningful.

---

# Feature 4: One Decision

## Purpose

Reduce friction.

Every day the app presents **one meaningful financial decision**.

Examples:

* Invest ₹200
* Increase SIP
* Skip an unnecessary expense
* Use portfolio liquidity intelligently

The user only needs to make **one decision today**.

---

# Feature 5: Borrow Without Break

## Internal name

**Break Glass**

## Purpose

This is the feature most closely aligned with BlinkMoney's core product.

When a user needs money, they should not feel that they are abandoning their future.

Instead of:

Sell investments

The app encourages:

Borrow against portfolio.

### The experience

* Preserve wealth streak
* Preserve Future You progress
* Preserve long-term compounding
* Access liquidity instantly

The message is:

**"Your future doesn't have to stop because life happened."**

This reinforces BlinkMoney's strongest differentiator.

---

# Behavioral loop

Future Feed

↓

One Decision

↓

Wealth Streak grows

↓

Future You evolves

↓

Borrow Without Break protects progress

↓

Return tomorrow

---

# Product principles

## Identity

Users become wealth builders.

## Progress

Small actions create visible future change.

## Protection

Emergencies should not destroy consistency.

## Emotion

Wealth should feel personal.

## Simplicity

One meaningful action every day.

---

# Why this fits BlinkMoney

FutureOS does not replace BlinkMoney.

It amplifies BlinkMoney's core philosophy.

**Invest. Grow. Borrow. Keep Growing.**

---

# Success metrics

This feature is designed to improve:

* Daily active users
* 7-day retention
* 30-day retention
* SIP consistency
* Borrowing retention
* Milestone sharing

---

# Final vision

BlinkMoney should not only help users build wealth.

It should help users become the kind of person who keeps building wealth.

That is the purpose of FutureOS.

---

# Build scope

## Constraint

Delivery deadline: **68 hours**.

Because of this, the vision above is documented in full, but **only 2–4 features will be built** for the deliverable. The remaining features stay in this README as the product narrative.

## Stack

* React Native (Expo)
* Distributed to the team via Expo Go — scan the QR code, run it on any phone

## Shipping decision

Four of the five features ship in this build:

| # | Feature | Status |
|---|---------|--------|
| 1 | Story-based onboarding | **Shipping** |
| 2 | Future You avatar | **Shipping** |
| 3 | Wealth Streak | **Shipping** |
| 4 | One Decision | Deferred — documented, not built |
| 5 | Borrow Without Break (Break Glass) | **Shipping** |

**Why this cut.** Onboarding creates the emotional hook in the first thirty seconds. Avatar and Streak are the identity-and-consistency core the whole thesis rests on. Break Glass is the feature tied most directly to BlinkMoney's real differentiator — borrowing against a portfolio instead of selling it — so dropping it would mean dropping the strongest argument in the pitch.

One Decision is deferred rather than cut. It is a single home-feed card and can be added if the build runs ahead of schedule.
