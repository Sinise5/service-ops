# Alert Rules - Comprehensive Guide

## Overview

Alert Rules automatically monitor your services and create incidents when conditions are met. ServiceOps supports both **simple single-condition rules** (legacy) and **advanced multi-condition rules** (new flexible system).

---

## Quick Start

### Create Your First Alert Rule

1. Go to **Alerts** page
2. Click **"+ Add Alert Rule"**
3. Fill in the form:
   - **Name**: "High Response Time"
   - **Condition**: "Threshold Exceeded"
   - **Threshold Value**: 1000 (milliseconds)
   - **Severity**: "Warning"
4. Click **"Create Alert Rule"**

✅ Done! Your rule now monitors all checks.

---

## Single-Condition Rules (Legacy)

Use this for simple monitoring needs.

### Supported Conditions

| Condition | Trigger | Use Case |
|-----------|---------|----------|
| **Threshold Exceeded** | Response time > threshold (ms) | Monitor slow services |
| **Check Failed** | Any check execution fails | Alert on service down |
| **SSL Certificate Expiring** | SSL cert expiring soon | Prevent certificate issues |

### Example 1: Monitor Response Time

```
Name: API Slow Response Alert
Condition: Threshold Exceeded
Threshold: 500 (ms)
Severity: Warning
```

**Triggers when:** API response time exceeds 500ms

**Sample incident:**
```
Title: API Slow Response Alert
Message: Check 'API Health Check' exceeded threshold (523ms > 500ms)
Severity: warning
Timestamp: 2026-06-18 15:30:45 WIB
```

---

### Example 2: Alert on Service Failure

```
Name: Service Down Alert
Condition: Check Failed
Severity: Critical
```

**Triggers when:** Service check fails (HTTP returns non-200, ping timeout, etc.)

**Sample incident:**
```
Title: Service Down Alert
Message: Check 'Database Connection' failed
Severity: critical
Timestamp: 2026-06-18 15:32:10 WIB
Status: DOWN
```

---

## Advanced Multi-Condition Rules (New)

Create complex, flexible rules with multiple conditions and logic operators.

### What are Advanced Conditions?

Instead of a single threshold, you can combine multiple conditions:

```
IF (response_time > 1000 AND status == "failed") THEN create_incident
IF (response_time > 2000 OR error_count > 10) THEN create_incident
```

### Supported Fields

| Field | Type | Examples | Use Case |
|-------|------|----------|----------|
| **response_time_ms** | Number | 100, 500, 1000 | Monitor latency |
| **status** | Text | "success", "failed", "timeout" | Monitor status |
| **output** | Text | "error message", "Connection refused" | Match specific errors |

### Supported Operators

| Operator | Meaning | Examples |
|----------|---------|----------|
| **>** | Greater than | `response_time > 1000` |
| **<** | Less than | `response_time < 100` |
| **==** | Equals | `status == "failed"` |
| **!=** | Not equals | `status != "success"` |
| **>=** | Greater or equal | `response_time >= 500` |
| **<=** | Less or equal | `response_time <= 200` |

### Logic Operators

| Operator | Meaning | Trigger When |
|----------|---------|--------------|
| **AND** | All conditions true | ALL conditions match |
| **OR** | Any condition true | ANY condition matches |

---

## Advanced Examples

### Example 3: High Latency OR Service Down (Critical)

```
Name: Critical Service Issue
Conditions:
  1. response_time > 2000
  2. status == "failed"
Logic: OR
Severity: Critical
```

**Triggers when:**
- Response time exceeds 2 seconds, OR
- Service status is "failed"

**Real-world scenario:**
- Check runs at 15:00 → response_time = 2150ms → **TRIGGERS** (condition 1)
- Check runs at 15:05 → status = "failed", response_time = 50ms → **TRIGGERS** (condition 2)
- Check runs at 15:10 → status = "success", response_time = 150ms → **NO TRIGGER** (both false)

---

### Example 4: Moderate Latency AND Errors (Warning)

```
Name: Degraded Performance Alert
Conditions:
  1. response_time > 800
  2. output contains "error"
Logic: AND
Severity: Warning
```

**Triggers when:**
- Response time exceeds 800ms, AND
- Output/logs contain "error"

**Real-world scenario:**
- 15:00 → response_time = 900ms, output = "database timeout" → **TRIGGERS** (both true)
- 15:05 → response_time = 900ms, output = "success" → **NO TRIGGER** (condition 2 false)
- 15:10 → response_time = 200ms, output = "error: retry" → **NO TRIGGER** (condition 1 false)

---

### Example 5: Response Time SLO Breach (Info)

```
Name: SLO Warning - Response Time
Conditions:
  1. response_time >= 300
  2. response_time < 500
Logic: AND
Severity: Info
```

**Triggers when:**
- Response time between 300ms and 500ms (yellow zone)
- Indicates degradation before critical threshold

---

## How to Add Conditions

### Step-by-Step UI Guide

1. **Open Alert Form:**
   - Click **"+ Add Alert Rule"** button
   - Fill in Name, Severity
   - (Optional) Set legacy Condition/Threshold for backup

2. **Navigate to Conditions Section:**
   - Scroll down to "Conditions" panel
   - See "No custom conditions" message initially

3. **Add First Condition:**
   - Click **"+ Add"** button (green)
   - New row appears with:
     - **Field** dropdown (response_time_ms, status, output)
     - **Operator** dropdown (>, <, ==, !=)
     - **Value** input (number or text)
     - **✕** button (remove)

4. **Set Condition Values:**
   - Example: Field=`response_time_ms`, Operator=`>`, Value=`1000`

5. **Add More Conditions (Optional):**
   - Click **"+ Add"** again
   - Repeat Step 3-4
   - Each condition appears on new row

6. **Set Logic Operator:**
   - Click **"AND"** or **"OR"** button at top right
   - Active button is highlighted (blue)
   - Selected logic applies to all conditions

7. **Review and Save:**
   - Review all conditions in list
   - Click **"Create Alert Rule"**
   - Rule is now active

---

## Monitoring & Incidents

### How Incidents Are Created

1. **Scheduler runs every 30 seconds**
2. **Each rule is evaluated** against latest check result
3. **If conditions match → Incident created**
4. **Notifications sent** (Telegram, Discord, Email)

### View Incident Details

1. Go to **Incidents** page
2. Click on incident row
3. See:
   - Alert rule that triggered
   - Conditions that matched
   - Check result
   - Timestamp
   - Severity

### Incident Lifecycle

```
Rule Active
    ↓
Check Executes
    ↓
Conditions Evaluated
    ├→ NO MATCH → No incident
    └→ MATCH → Incident Created
           ↓
        Notifications Sent
           ↓
        Acknowledge/Resolve
```

---

## Best Practices

### 1. Use Meaningful Names
✅ "API Response Time SLO Warning"
❌ "alert1"

### 2. Set Appropriate Thresholds
- **Response Time:** 500-1000ms for warning, 2000ms+ for critical
- **Error Rates:** 5-10% for warning, 20%+ for critical

### 3. Use AND for Strict Rules
```
AND = "only trigger if DEFINITELY a problem"
Example: High latency AND errors both occurring
```

### 4. Use OR for Alert Coverage
```
OR = "trigger if ANY problem detected"
Example: Either service is down OR response time is very high
```

### 5. Combine Conditions Logically
❌ Poor: `response_time > 1000 OR response_time < 100` (always true)
✅ Good: `response_time > 1000 AND error_count > 5` (specific condition)

### 6. Test Before Deployment
- Create rule with low threshold
- Wait for incident to trigger
- Verify notifications received
- Adjust threshold as needed

---

## Troubleshooting

### Rule Not Triggering

**Issue:** Condition set correctly but no incidents created

**Check:**
1. Is check executing? (View Logs → Monitoring page)
2. Does check result match condition?
3. Is rule enabled? (Status column shows "enabled")
4. What is actual value? (Compare to threshold)

**Example Debug:**
```
Rule: response_time > 1000
Last check result: response_time = 450ms
→ Condition NOT met (450 is not > 1000)
```

### Rule Triggering Too Often

**Issue:** Getting too many incidents

**Solution:**
1. Increase threshold: `response_time > 1000` → `response_time > 2000`
2. Add AND condition to be more specific
3. Change severity to reduce alert noise

---

## API Reference

### Create Alert Rule (POST /alerts/rules)

**Legacy (single condition):**
```json
{
  "check_id": "uuid-of-check",
  "name": "High Response Time",
  "condition": "threshold_exceeded",
  "threshold": 1000,
  "severity": "warning",
  "enabled": true
}
```

**Advanced (multi-condition):**
```json
{
  "check_id": "uuid-of-check",
  "name": "Critical Service Issue",
  "conditions": [
    {
      "field": "response_time_ms",
      "operator": ">",
      "value": 2000
    },
    {
      "field": "status",
      "operator": "==",
      "value": "failed"
    }
  ],
  "logic": "OR",
  "severity": "critical",
  "enabled": true
}
```

---

## FAQ

**Q: Can I use both legacy and advanced conditions?**
A: Yes. If both are set, advanced conditions take priority.

**Q: Can I edit a rule after creation?**
A: Yes. Click rule → Edit → Modify conditions → Save.

**Q: How many conditions can I add?**
A: Unlimited. More conditions = more specific rule.

**Q: What happens if rule is disabled?**
A: Rule is not evaluated. No incidents created.

**Q: Can I copy a rule?**
A: Not yet. Create new rule with same conditions.

---

## Contact Support

For issues or questions:
- Check this guide first
- Review troubleshooting section
- Contact admin@serviceops.local
