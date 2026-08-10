# PREDIKTIVE INSTANDHALTUNG — User Guide

**Betriebsleitstand** · Smart monitoring for plastic extrusion

---

## Who this guide is for

This guide is written for **application users** who need a clear picture of how the line is running, whether process conditions are stable, and when something needs attention—without needing a technical background.

After reading it, you should know:

- **Why** the Application exists and what decisions it supports  
- **What** each screen tells you about your production  
- **How** to use each area in daily work  
- **What benefits** you gain for quality, uptime, and communication  

---

## Table of contents

1. [Why use this Application?](#1-why-use-this-application)
2. [Getting started](#2-getting-started)
3. [Finding your way around](#3-finding-your-way-around)
4. [Screens explained](#4-screens-explained)
   - [Dashboard](#dashboard)
   - [Daten exportieren](#daten-exportieren)
   - [Maschinen](#maschinen)
   - [Sensoren](#sensoren)
   - [Materialprofil](#materialprofil)
   - [Live-Werte](#live-werte)
   - [Basislinie](#basislinie)
   - [Live-Schätzungen](#live-schätzungen)
   - [Benachrichtigungen](#benachrichtigungen)
5. [Understanding machine states](#5-understanding-machine-states)
6. [Everyday tips for application users](#6-everyday-tips-for-application-users)

---

## 1. Why use this Application?

### The challenge in daily operations

Extrusion production depends on many signals at once: temperatures, pressure, screw speed, motor load, material behaviour, and machine phase (heating, running, cooling). When something drifts, scrap and downtime often follow—but the warning signs can be easy to miss during busy periods.

### What this Application gives you

**PREDIKTIVE INSTANDHALTUNG** brings live and historical process information into one place so application users can:

| Benefit | What it means for you |
|--------|------------------------|
| **See the line at a glance** | One home screen shows whether the machine is producing, whether monitoring is active, and whether key values look normal or need attention. |
| **Act before quality suffers** | Colour indicators and comparisons to agreed reference ranges highlight pressure, load, and temperature issues while you can still adjust the process. |
| **Understand “good” for each material** | Material profiles define what acceptable ranges look like for a grade—so evaluations match what you actually run. |
| **Review any period in detail** | Export and analyse sensor history for investigations, customer complaints, or handovers between users. |
| **Stay informed automatically** | Email notifications can alert the right people when the system detects critical or warning conditions. |
| **Support continuous improvement** | Trends and summaries help review meetings focus on facts, not only memory. |

The Application does **not** replace your procedures or machine controls; it **supports** faster awareness and better conversations about what the line is doing. Different application users may use different screens depending on their responsibilities and access.

---

## 2. Getting started

### Opening the Application

1. Open the link provided by your company in a normal web browser (Chrome, Edge, or Firefox work well).  
2. You will see the sign-in page (**Predictive Maintenanace — Smart Monitoring System**).  
3. Enter your **email** and **password** (from your administrator).  
4. Select **Sign In**.

You land on the **Dashboard**—your main overview screen.

### Signing out

Use your name in the top-right corner and choose **Logout** when you finish, especially on shared PCs.

### If sign-in does not work

| What you see | What to do |
|--------------|------------|
| Invalid credentials | Check email/password; contact your administrator if forgotten. |
| System not responding | Wait a moment and try again; inform IT if the plant network or server is down. |
| Returned to sign-in while working | Sign in again; your session may have ended after a period of inactivity. |

---

## 3. Finding your way around

### Top bar (header)

| What you see | What it tells you |
|--------------|-------------------|
| **PREDIKTIVE INSTANDHALTUNG — Betriebsleitstand** | You are in the operations control Application. |
| **KI status** | Whether the intelligent monitoring service is available to evaluate your process. |
| **Alert service** | Whether automatic alerting is turned on or off (may be controlled by authorised application users). |
| **Your name and role** | Which application user is logged in. |
| **Logout** | End your session securely. |

On phones and tablets, use the **menu icon** to open the navigation list.

### Side menu (navigation)

Click an item to open that area. The current page is highlighted in purple.

| Menu (as shown in the Application) | In short |
|-----------------------------------|----------|
| **Dashboard** | Live overview of the extruder and key KPIs |
| **Daten exportieren** | Historical data for a chosen machine and time period |
| **Maschinen** | List and setup of machines on the line |
| **Sensoren** | Definitions of measured values (names, units, limits) |
| **Materialprofil** | Acceptable ranges per material grade |
| **Live-Werte** | Latest readings updating in near real time |
| **Basislinie** | Reference ranges used for “normal” during each machine phase |
| **Live-Schätzungen** | Deeper live analysis: stability, trends, AI summary |
| **Einstellungen → Benachrichtigungen** | Who receives email alerts |

Some menu labels (e.g. **Vorhersagen**, **Alarme**, **Tickets**, **Berichte**, **KI-Dienst**, **Webhooks**, **Rollen**) may appear for future functions. If a page opens empty or does not load, your administrator can confirm whether that function is enabled for your site.

---

## 4. Screens explained

For each screen below you will find:

- **What you are looking at** — the business context  
- **Information on screen** — what the numbers and colours mean  
- **How application users use it** — practical use  
- **Benefits** — why it matters  

---

### Dashboard

**Menu:** Dashboard  

#### What you are looking at

This is your **control-room view** for the extruder: “Is everything connected? What phase is the machine in? Are we in a good production window? How do the main process values compare to what we expect?”

The screen updates automatically while you stay on it, so you always see a recent picture without refreshing the page.

#### Information on screen

1. **Title — Extruder Überwachungsdashboard**  
   Confirms you are monitoring extrusion with predictive maintenance support.

2. **Service status (top cards)**  
   - **KI-Dienst** — Is intelligent evaluation available?  
   - **Database connection** — Is live plant data reaching the Application?  
   If either shows a problem, some charts or traffic-light colours may be missing until IT resolves it.

3. **Maschinenzustand (machine state)**  
   Shows the **current phase**, for example:  
   - Machine off  
   - Ready (warmed, waiting)  
   - Heating up  
   - **Production** (process running)  
   - Cooling down  

   Also shows whether a **baseline** and **material profile** are ready for evaluation—needed for meaningful green/amber/red KPIs during production.

4. **KPI cards (main process values)**  
   Typical examples: motor load, pressure, screw speed, temperatures.  
   During **production**, you may see:  
   - Current value and unit  
   - Reference average (“baseline mean”)  
   - Acceptable band (“green band”)  
   - Short explanation when something is off  

   **Colours (during production):**  
   - **Green** — within expected range  
   - **Amber** — watch closely; possible drift  
   - **Red** — outside expected range; investigate  

   Outside production, values may appear neutral (grey)—that is normal; traffic lights are meant for the running process.

5. **Temperature zones**  
   Barrel/zone temperatures and how they relate to expectations.

6. **Trend charts**  
   History of important signals. You can switch the window, for example:  
   - Last hour  
   - Last day  
   - Last week  
   - Last month  

#### How application users use it

- **When starting work** — Confirm machine phase, KI and data connection, and baseline/profile readiness.  
- **During the run** — Watch KPI colours; discuss amber/red before scrap builds.  
- **Meetings** — Use charts to show “what happened” in the last hour or selected period.  

#### Benefits

- One screen answers “Are we OK to run?” and “Is anything drifting?”  
- Less reliance on walking the line alone for early warning.  
- Shared language (states, colours) between application users.  

---

### Daten exportieren

**Menu:** Daten exportieren  

#### What you are looking at

A **reporting and investigation workspace** for a **specific machine** and **time period** you choose—for example after quality issues, for customer documentation, or for comparing two time periods.

#### Information on screen

**Filters (top)**  
- **Machine** — which extruder  
- **Line** — production line identifier (often pre-filled)  
- **From / To** — start and end date and time  
- **Load Data** — loads all sections below  

You must pick a machine and both dates; the start must not be after the end.

**Time range summary**  
Answers: “How much data do we have, for how long, and what happened on average?”  
- Number of measurements  
- Duration of the selected period  
- Averages: screw speed, pressure, temperature zones  
- Minimum and maximum pressure  
- **Machine state timeline** — when the machine was off, heating, in production, cooling, etc., across that period  

**Data quality summary** (expandable)  
Helps you trust the numbers before decisions:  
- Gaps or missing readings  
- Sensors stuck on one value  
- Values that look impossible  
- Duplicate timestamps  
- Periods with no data  

**Raw sensor data** (expandable)  
- Table of all readings with time and sensor columns  
- Move through pages if the period is long  
- **Export CSV** — download for Excel or quality systems  

**Sensor charts** (expandable)  
- One graph per sensor over the selected period  
- Useful to see when a drift started or stopped  

#### How application users use it

- After a **quality event** — pull the exact window when scrap started.  
- For **handover** — export data for the next application user or session.  
- For **audits** — show objective process history.  

#### Benefits

- Evidence-based discussions instead of guesswork.  
- Faster root-cause meetings.  
- Export supports quality and customer reporting outside the Application.  

---

### Maschinen

**Menu:** Maschinen  

#### What you are looking at

The **register of extruders (machines)** your plant monitors in the Application. Each machine is the anchor for filters, exports, and assignments elsewhere.

#### Information on screen

Each machine card shows, for example:  
- Name  
- Location on site  
- Description  
- Online/offline status  
- Criticality (how important the asset is for monitoring)  
- When it was added  

**Add machine** — register a new line asset (when your access allows).  
**Edit** — update name, location, or notes.  
**Delete** — remove a machine from the list (confirm carefully; affects historical links).

#### How application users use it

- Ensure every line you monitor appears with a clear, recognisable name.  
- Keep location and description useful for handovers (“Line 2 — hall B”).  

#### Benefits

- Correct machine names in exports and dashboards—no confusion in meetings.  
- Clear ownership of which assets are under predictive maintenance.  

---

### Sensoren

**Menu:** Sensoren  

#### What you are looking at

The **catalog of measurements** the Application knows about: what each signal is called, its unit, and warning levels. This turns raw plant tags into readable names on dashboards and exports (e.g. “Screw speed” instead of internal codes).

#### Information on screen

Per sensor, you typically see:  
- Name (as shown on screen)  
- Type and unit (rpm, bar, °C, amp, etc.)  
- Minimum and maximum  
- Warning and critical thresholds  

You can add, edit, or remove sensor definitions when your access allows.

#### How application users use it

- Align names with terminology used in your organisation.  
- Set warning/critical levels that match your standard procedures.  

#### Benefits

- Everyone sees the same labels in Live-Werte, Dashboard, and exports.  
- Limits support consistent interpretation for all application users.  

---

### Materialprofil

**Menu:** Materialprofil  

#### What you are looking at

**Material-specific “acceptable windows”** for process sensors. When you run Material A versus Material B, the Application can judge values against the right profile—not one generic range for everything.

#### Information on screen

- List of material profiles (name, active/inactive)  
- For each material: min/max per sensor when you create or edit  
- **Activate** one profile for current production context (rules may allow only one active profile—follow your site procedure)  

#### How application users use it

- Create a profile when you introduce a new grade.  
- Activate the correct profile at changeover.  
- Review thresholds when material specifications change.  

#### Benefits  

- Evaluations match **your** material, not a default.  
- Fewer false alarms when changing product.  
- Stronger link between material data sheet and live monitoring.  

---

### Live-Werte

**Menu:** Live-Werte  

#### What you are looking at

A **live snapshot** of current extruder readings—like glancing at the machine’s latest instrument panel on screen. Values refresh every few seconds.

#### Information on screen

- **Time of last update** — how fresh the snapshot is  
- **Cards** — one per measurement with current value  
- **Green flash** on a card — that value just changed (data is flowing)  
- **Show more / Show less** — optional extra signals  

#### How application users use it

- Quick check during setup or production without walking to the HMI only.  
- Confirm data is updating after a restart or material change.  

#### Benefits  

- Immediate reassurance that monitoring is live.  
- Simple view when you need numbers at a glance, not charts.  

---

### Basislinie

**Menu:** Basislinie  

#### What you are looking at

**Reference baselines** tied to **machine phase** (e.g. production vs heating). These define what “normal” looks like for KPI colours and green bands on the Dashboard and in live analysis.

#### Information on screen

- Named baselines  
- For each baseline: which machine states it applies to  
- Per sensor in that state: minimum and maximum reference  

Create, edit, or delete baselines when your access allows.

#### How application users use it

- Maintain baselines after process optimisation or new product approval.  
- Check Dashboard “Baseline: Ready” before expecting traffic-light KPIs.  

#### Benefits  

- Comparisons reflect **how you intend to run**, not generic industry defaults.  
- Supports standardisation: same meaning of “green” for every application user.  

---

### Live-Schätzungen

**Menu:** Live-Schätzungen  

#### What you are looking at

A **deeper live intelligence view** for the current process window: not only raw values, but stability vs baseline, short trends, and a plain-language summary of how healthy the run looks.

#### Information on screen

**Header**  
- When data was last updated  
- **Auto refresh** — on: screen updates about every 10 seconds; off: frozen for study  

**Summary bar**  
Overall picture: system status, detected operating state, regime, stability, drift, anomaly indicators.

**Process parameters**  
Cards for screw speed, pressure, temperature, load, and derived indicators (e.g. pressure per rpm, temperature spread). Each may show current value, variability, trend direction, and a small trend line.

**Parameter trends chart**  
Combined view of how key parameters moved over the last few minutes.

**Stability table**  
Each parameter compared to baseline: deviation and status (healthy / warning / critical).

**Quick insights**  
Short messages, e.g.:  
- Is the process stable?  
- Is temperature spread increasing?  
- Should pressure be watched?  
- Overall performance index  

#### How application users use it

- **During a sensitive run** — keep auto refresh on and watch stability table.  
- **When Dashboard shows amber** — open Live-Schätzungen for which parameter and how fast it is moving.  
- **Training** — help other application users understand how the summary describes run health.  

#### Benefits  

- Earlier sense of **drift** before scrap.  
- Clearer summary than raw numbers alone.  
- Supports proactive adjustments, not only reactive firefighting.  

---

### Benachrichtigungen

**Menu:** Einstellungen → Benachrichtigungen  

#### What you are looking at

**Who gets emailed** when the system detects important events (e.g. critical process warnings, alarms). Application users with access use this to make sure the right people are in the loop—even when not watching the Dashboard.

#### Information on screen

**Recipient list**  
- Email, optional name and note  
- Enable or disable each person  
- Add or remove recipients  

**Test email**  
- Send a test to one address, or to all active recipients if you leave the test field empty  
- Confirms mail delivery works  

Typical alert types (depending on your site setup) may include critical AI warnings, alarm triggers, or account-related messages.

#### How application users use it

- Add the email addresses that should receive alerts.  
- Disable recipients who no longer need notifications; add replacements.  
- Run a test after mail settings are changed.  

#### Benefits  

- Faster response when nobody is on the Dashboard.  
- Documented path from detection to human action.  
- Less risk that issues go unnoticed outside active monitoring hours.  

---

## 5. Understanding machine states

The Application shows **which phase the extruder is in**. KPI traffic lights and baselines are most meaningful during **production**.

| State (typical label) | What it means for application users |
|----------------------|----------------------------|
| **OFF** | Machine shut down; no heating. Monitoring may be limited. |
| **IDLE / Ready** | Warmed and waiting; not extruding product. |
| **HEATING** | Warm-up before production; parameters still settling. |
| **PRODUCTION** | Process running—use KPI colours and baselines here. |
| **COOLING** | Run ended; machine cooling down. |

Short explanations on the Dashboard (in German) describe each phase in plain language—use them in briefings so every application user uses the same terms.

---

## 6. Everyday tips for application users

### When you begin (about 5 minutes)

1. Open **Dashboard** — check KI and data connection.  
2. Note **machine state** and baseline/profile readiness.  
3. If in production, scan KPI colours.  
4. Open **Live-Werte** or **Live-Schätzungen** if anything looks amber or red.  

### During production

- Keep **Dashboard** visible on a shared display if your site allows it.  
- Treat **amber** as “discuss and watch”; **red** as “act per your standard procedure”.  
- After material change, confirm the right **Materialprofil** is active.  

### After an incident or quality hold

1. Note approximate **time and machine**.  
2. Open **Daten exportieren**, select that window, **Load Data**.  
3. Read **summary** and **data quality** first, then charts or **Export CSV**.  
4. Use exports in review meetings and corrective actions.  

### When numbers look empty or grey

- Machine may not be in **production** phase.  
- Baseline or material profile may not be ready—check **Basislinie** and **Materialprofil**.  
- Data connection may be down—check status on Dashboard and inform IT.  

### Getting help

Tell support or IT:

- Which **menu page** you were on  
- **Machine** and **time period** (if relevant)  
- What message appeared on screen  
- What you expected vs what you saw  

---

## Quick reference — menus and purpose

| Menu | Primary question it answers |
|------|----------------------------|
| Dashboard | Is the line OK right now? |
| Daten exportieren | What happened in this time window? |
| Maschinen | Which machines do we monitor? |
| Sensoren | What do we measure and how is it named? |
| Materialprofil | What is acceptable for this material? |
| Live-Werte | What are the latest readings? |
| Basislinie | What is “normal” in each machine phase? |
| Live-Schätzungen | How stable is the run, and what should we watch? |
| Benachrichtigungen | Who gets alerted by email? |

---

*PREDIKTIVE INSTANDHALTUNG — supporting application users with clearer visibility, earlier awareness, and better decisions on the extrusion line.*
