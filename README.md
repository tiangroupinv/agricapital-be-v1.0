Product Requirements Document (PRD)
AgriCapital Rwanda — Web Platform (MVP)

Founder: Joana Uwamahoro Document owner: AgriCapital Rwanda Status: Draft v1.0 Target MVP Launch: October 19, 2026 Audience: Engineering team (in-house or outsourced), investors / technical due diligence reviewers

1. Overview

AgriCapital Rwanda is a digital agri-fintech platform connecting three groups in Rwanda's agriculture sector:

* Investors — urban professionals, diaspora, and institutions seeking transparent, insured returns from funding farming and livestock cycles.
* Farmers & Livestock Keepers — smallholders and cooperatives needing working capital for feeds, vaccines, seeds, and fertilizer.
* Off-Takers (Bulk Buyers) — hotels, schools, processing factories, supermarkets, and exporters needing a reliable produce/livestock supply.

The platform de-risks agricultural investment by pairing capital with pre-signed buyer contracts (reverse marketplace), progress tracking, and NAIS insurance coverage (Rwanda's National Agriculture Insurance Scheme).
This PRD defines the MVP — the pilot-scale version of the platform intended to support AgriCapital's Year 1 target of 10 pilot projects and ~100 active farmers/livestock keepers, launching by October 19, 2026.

2. Goals & Success Metrics

MVP Goals

1. Enable investors to discover, review, and fund vetted farming/livestock cycles.
2. Enable field agents to onboard farmers, record cycle details, and post progress updates that investors can see.
3. Enable off-taker agreements to be recorded and linked to funded cycles (reverse marketplace, manually brokered in v1).
4. Track NAIS insurance coverage status per cycle (recorded manually by admin/ops in v1, not a live insurer integration).
5. Support secure fund collection and phased, controlled disbursement to farmers.

Success Metrics (Year 1 targets from business plan)

Metric
	Target

Funded pilot projects
	10

Active farmers & livestock keepers
	100

Gross Investment Volume
	50,000,000 RWF

Net Revenue (platform margin)
	~7,500,000 RWF

Insurance coverage
	100% of funded cycles NAIS-covered


Out of Scope for MVP

* Automated/API-based NAIS insurer integration (v1 is manual/MoU-based tracking).
* Automated off-taker matching algorithm (v1 is manually brokered by ops/field agents).
* Data & Analytics premium subscription tier for enterprise farms (Year 2+ revenue stream).
* Pan-African / multi-country expansion features.
* Native mobile apps (MVP is web-based; mobile-responsive only).


3. User Roles & Personas

Role
	Description
	Core Needs

Investor
	Urban/diaspora individual or institution funding cycles
	Browse vetted opportunities, invest, track progress, view insurance status, receive returns/payout records

Farmer / Livestock Keeper
	Smallholder or cooperative receiving capital
	Apply/be onboarded for a cycle, see disbursement status, submit updates (via field agent)

Off-Taker (Bulk Buyer)
	Hotel, school, factory, exporter, supermarket
	Recorded as a contracted buyer for a cycle; agreement terms visible to relevant staff

Field Agent
	AgriCapital staff/contractor visiting farms
	Onboard farmers, log farm visits, post progress/health updates, upload photos

Admin / Ops (incl. DPO)
	AgriCapital internal staff
	Vet and approve cycles, manage disbursements, record insurance status, manage users, oversee compliance



4. Core User Flows (MVP)

4.1 Cycle Creation & Vetting (Admin/Ops + Field Agent)

1. Field agent onboards a farmer/livestock keeper and submits a proposed funding cycle (type, target amount, purpose — feeds/vaccines/seeds/fertilizer, expected duration).
2. Admin/Ops reviews the cycle, confirms an off-taker agreement exists (recorded manually), confirms NAIS insurance status, and approves the cycle for listing.
3. Approved cycle becomes visible to investors on the platform.

4.2 Investor Discovery & Funding

1. Investor browses/filters approved cycles (by crop/livestock type, funding target, location, off-taker).
2. Investor views cycle detail: farmer profile, off-taker agreement summary, insurance status, funding progress, expected timeline and returns.
3. Investor commits funds via mobile money or bank transfer/escrow.
4. Funds are held by AgriCapital (escrow) until the cycle reaches its funding target.
5. Investor receives confirmation and can track the cycle from their dashboard.

4.3 Phased Disbursement

1. Once a cycle is fully funded, Admin/Ops releases funds in tranches tied to actual farm supply purchases (feeds, vet care, seeds) rather than as a lump sum.
2. Each disbursement is logged and visible to the investor (transparency).

4.4 Progress Tracking

1. Field agent logs periodic visit updates (text + photo) against the cycle — livestock health/vaccination status or crop growth stage.
2. Investor views a real-time-ish timeline/dashboard of updates for cycles they've funded.

4.5 Cycle Completion & Payout

1. At harvest/cycle completion, Admin/Ops records the sale to the off-taker and final proceeds.
2. Platform calculates investor returns net of AgriCapital's Platform Investment Fee (10–15%) and Off-taker Brokerage Fee (3–5%).
3. Payout is recorded and (in MVP) processed manually via mobile money/bank transfer, tracked on-platform.

4.6 Insurance & Risk Event Handling

1. If a loss event occurs (disease, weather), Admin/Ops logs the incident against the cycle and its NAIS claim status.
2. Investors funding that cycle see the incident and claim status reflected on their dashboard.


5. Functional Requirements

5.1 Authentication & User Management

* Role-based signup/login for Investor, Farmer, Off-Taker (record-only, may not need login in v1), Field Agent, Admin/Ops.
* Basic KYC fields for Investors (name, ID/passport, phone, mobile money or bank details).
* Basic profile fields for Farmers/Livestock Keepers (name, location, ID, farm/livestock type, cooperative if applicable).

5.2 Cycle (Project) Management

* Create/edit/approve funding cycles (Admin/Ops, Field Agent input).
* Cycle fields: type (crop/livestock), target amount, purpose, duration, linked farmer(s), linked off-taker agreement (manually attached), insurance status, funding status, disbursement log.
* Cycle status states: Draft → Under Review → Approved/Listed → Funding → Funded → In Progress → Completed → Closed (and a Cancelled/Failed path).

5.3 Investor Dashboard

* Browse/filter listed cycles.
* Cycle detail view (as in 4.2).
* "My Investments" view: funded cycles, disbursement history, progress updates, insurance/incident status, projected and actual returns.
* Fund a cycle (initiate mobile money or bank/escrow payment).

5.4 Field Agent Tools

* Farmer onboarding form.
* Cycle progress update form (text, photo upload, date, cycle link).
* List of assigned farms/cycles.

5.5 Admin/Ops Console

* Cycle approval workflow.
* Disbursement management (log tranche releases against a cycle).
* Off-taker agreement recording (manual entry: buyer name, product, price, quantity, contract reference/upload).
* Insurance status tracking per cycle (NAIS covered: yes/no, policy reference, claim log).
* User management (all roles).
* Basic reporting: funded volume, active cycles, farmer/investor counts — mapped to the Year 1 metrics table in Section 2.

5.6 Payments

* Investor funding via mobile money (e.g., MTN MoMo / Airtel Money) and/or bank transfer into an escrow-style holding account.
* Disbursement to farmers/suppliers via mobile money or bank transfer, logged on-platform (manual trigger by Admin/Ops in MVP; payment gateway integration left open for engineering to scope).
* All payment records auditable and tied to a specific cycle.

5.7 Notifications

* Basic email and/or SMS notifications for: investment confirmation, disbursement made, new progress update posted, cycle completed/payout issued.

5.8 AI-Powered Live Map — Crop Monitoring, Climate & Investment Targeting

A single interactive map view that layers together, per cycle/location:

* Live crop & livestock monitoring: Field agent updates (Section 5.4) and, where feasible, satellite/remote-sensing crop health indicators (e.g. vegetation index) plotted on the map per farm/cycle location, so investors can see farm condition at a glance rather than reading a text log.
* Climate & weather effects overlay: Rainfall, drought risk, and temperature data per region, sourced from a weather/climate API, shown as a map layer so investors and Admin/Ops can see climate exposure for each active or prospective cycle (feeds into risk flagging and NAIS claim triggers in Section 9).
* Farming season tracking: A seasonal calendar layer showing planting/growing/harvest windows by crop and livestock type and region (Rwanda's A/B/C growing seasons), so cycle timing and investor expectations line up with actual agricultural calendars.
* AI-powered investment targeting: Using the combined signals above (crop/farm health, climate risk, seasonal timing, historical cycle performance), the platform surfaces and ranks recommended cycles to investors — e.g. "high seasonal fit, low climate risk, strong farm health" — directly on the map, rather than a flat list.

MVP framing: Given the Oct 19, 2026 deadline, this is the most technically ambitious item in the PRD and should be scoped in two tiers:

* Tier 1 (launch-feasible): Map view plotting cycle locations with field-agent-submitted progress updates and a manually-curated seasonal calendar layer, plus a simple rules-based (not ML-based) "recommended for you" ranking using season fit + climate risk flags entered by Admin/Ops.
* Tier 2 (fast-follow): Satellite/remote-sensing crop health data, live weather API integration, and a trained AI recommendation model replacing the rules-based version.

Engineering should confirm at kickoff whether Tier 1 is achievable by Oct 19 alongside the core platform (Sections 5.1–5.7), or whether it should be flagged as a post-launch release.

6. Non-Functional Requirements

* Compliance: Platform must support AgriCapital's registered compliance obligations under Rwanda's Data Protection Law (Law n°058/2021) as both Data Controller and Data Processor — consent capture, data minimization, secure storage of financial/personal data, and audit logging of access to sensitive records.
* Security: Encrypted storage/transmission of financial and personal data; role-based access control; secure handling of escrow-related records.
* Availability: Platform should be reliably available during business hours in Rwanda (CAT, UTC+2); formal uptime SLA left open for engineering to define at MVP stage.
* Performance: Should comfortably handle MVP-scale load (~100 farmers, ~10 cycles, low hundreds of investors) with no specific high-throughput requirement at this stage.
* Auditability: All fund movements (investor → escrow → disbursement → payout) must be logged and traceable per cycle.
* Localization: English and Kinyarwanda language support strongly preferred for farmer-facing and field agent tools; open for engineering to phase in.


7. Technical Considerations

Technology stack, hosting, and architecture are intentionally left open for the engineering team to decide, given MVP timeline constraints. The PRD instead specifies required capabilities and integration points:

* Payments: Integration with at least one Rwandan mobile money provider (MTN MoMo and/or Airtel Money) and a bank transfer/escrow mechanism. Provider selection left to engineering.
* Insurance (NAIS): No live API integration required for v1 — insurance status is recorded and tracked manually by Admin/Ops based on the MoU/partnership with NAIS-certified insurers. Data model should anticipate a future API integration.
* Media storage: Support for photo uploads from field agents (farm/livestock progress updates).
* Mapping & geospatial: Interactive map component (e.g. a JS mapping library) capable of rendering layered data (farm locations, climate overlays, seasonal calendar) — see Section 5.8. Provider/library choice left to engineering.
* Weather/climate data: Integration with a weather/climate data API for the climate overlay in Section 5.8. Provider left to engineering; should be selected with Rwanda/East Africa coverage in mind.
* AI/ML for investment targeting: Tier 1 (launch) uses rules-based ranking, no ML infrastructure required. Tier 2 (fast-follow) will need a lightweight recommendation model — architecture left open for engineering, but should be scoped separately from the MVP launch critical path.
* Web platform: Responsive web app (desktop + mobile browser); native apps out of scope for MVP.


8. Key Data Entities (High-Level)

* User (role, contact info, KYC status)
* Farmer/LivestockKeeper Profile (linked to User, location, farm/livestock type, cooperative)
* Cycle/Project (type, target amount, status, dates, linked Farmer(s), linked Off-Taker Agreement, Insurance record)
* Off-Taker Agreement (buyer name, product, price, quantity, contract reference)
* Investment (Investor, Cycle, amount, payment method, status)
* Disbursement (Cycle, amount, purpose, date, method)
* Progress Update (Cycle, Field Agent, date, text, photo(s))
* Insurance Record (Cycle, NAIS covered y/n, policy reference, claim log)
* Payout (Cycle, Investor, amount, fees deducted, date)


9. Compliance & Risk

* Data handled under Rwanda's Law n°058/2021; AgriCapital is registered as both Data Controller and Data Processor with the NCSA — the platform's data handling (consent, storage, access logs) must align with this registration.
* Investor funds are held and released in phases tied to verified farm supply purchases, not released as a lump sum — this must be enforced in the disbursement workflow, not just policy.
* NAIS insurance coverage is tracked per cycle so that in the event of a loss (disease/weather), claim status and investor communication can happen quickly.


10. Timeline & Milestones

Target MVP launch: October 19, 2026.

Milestone
	Target

PRD sign-off & engineering kickoff
	TBD (immediate priority given launch date)

Core platform build (auth, cycles, investor dashboard, admin console)
	Pre-launch

Payments integration (mobile money/bank)
	Pre-launch

Pilot onboarding (first cycles, farmers, off-taker agreements loaded)
	Pre-launch

MVP Launch — Platform Beta Release
	Oct 19, 2026


Note: given the compressed timeline, engineering should assess feasibility of the full scope in Section 5 against the Oct 19 date early, and flag any features that need to be deferred to a fast-follow release.

11. Open Questions

1. Which mobile money and/or bank/escrow provider(s) will be used at launch?
2. Who are the confirmed pilot farmers/livestock keepers and off-takers for the 10 pilot projects, and is that data ready to be loaded before launch?
3. Is there a confirmed NAIS-certified insurance partner (MoU signed) in time for pilot cycles to be marked "insured" at launch?
4. What level of Kinyarwanda localization is needed at launch vs. fast-follow?
5. Who will staff the Field Agent and Admin/Ops roles at pilot scale?
6. Is Tier 1 of the AI-powered map (Section 5.8) achievable by Oct 19, or should it be a fast-follow release after core platform launch?
7. Which weather/climate data provider has usable coverage for Rwanda, and at what cost/rate limits?


12. Appendix

Source: AgriCapital Rwanda Business Plan (Creative Director and Innovation Lead: Joana Uwamahoro).


Action Required ( Click here )

link with github repo of agricapital:

* create the branch
* commit with good message to easy understand

