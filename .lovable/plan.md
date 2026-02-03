
# Close All Open Tickets Except #103 and #104

## Summary
Close 12 open support tickets while keeping tickets #103 and #104 open.

## Tickets to be Closed

| # | Subject | From |
|---|---------|------|
| 90 | How Propscholar Appears to Customers Online | deshinapro@gmail.com |
| 89 | No Subject | udaygaud17@gmail.com |
| 88 | Account Access | positiontrades7@gmail.com |
| 85 | Payment issue | aryamanyadav172@gmail.com |
| 84 | Order issue | aryamanyadav271@gmail.com |
| 83 | Payment done but dashboard is empty | sherintrades@gmail.com |
| 82 | Marketing Plan for PropScholar | tezza0x@gmail.com |
| 69 | traderdee Collaboration Opportunity | chidex538@gmail.com |
| 68 | Didn't get any account or payment details | gohelfenil11@gmail.com |
| 67 | Purposal Partnership | social.naitikgadhave@gmail.com |
| 66 | No Subject | gtergergwgr@gmail.com |
| 64 | STRATEGIC GROWTH PARTNERSHIP NEW | hamzatshobande@gmail.com |

## Tickets Staying Open
- **#104** - custom boxes (jason.miller@availswag.co)
- **#103** - Review of my phase one account (slipemarch@gmail.com)

## Implementation

### Database Migration
Run a single UPDATE statement to close all open tickets except #103 and #104:

```sql
UPDATE support_tickets
SET 
  status = 'closed',
  closed_at = NOW(),
  updated_at = NOW()
WHERE status = 'open'
AND ticket_number NOT IN (103, 104);
```

## Note
Since these tickets are being bulk-closed by admin (not through the normal close flow), **no closure emails will be sent** to the users. If you want closure emails sent, let me know and I can trigger them individually.
