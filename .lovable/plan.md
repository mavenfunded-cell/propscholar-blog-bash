

## Enhanced AI Email Assistant - Direct Code Editing

### Overview
Upgrade the AI Email Assistant sidebar to provide powerful code editing capabilities. The AI will be able to directly modify HTML code, edit templates, add/remove sections, change styles, and make precise edits based on natural language instructions - all while having **no ability to send emails** (send functionality remains completely separate).

### Current State
- The AI generates text suggestions that you manually apply
- "Apply to Email" button does basic content replacement
- No ability to make specific HTML/CSS changes
- No ability to edit specific sections or elements

### Enhanced Features

#### 1. **New "Code Edit" Tab**
A dedicated tab for direct HTML manipulation:
- **Natural Language Code Editor**: Describe what you want changed (e.g., "Change the button color to red", "Add a countdown timer section", "Make the header background gold")
- **Smart Context**: AI sees the full HTML structure and makes precise edits
- **Diff Preview**: Shows what will change before applying
- **Undo Support**: Revert last AI edit if needed

#### 2. **Section-Aware Editing**
AI understands email structure:
- Header section editing
- Content/body section editing  
- Footer section editing
- Style/CSS editing
- Add new sections between existing ones

#### 3. **Quick Code Actions**
One-click code modifications:
- "Change button color" → Color picker + AI applies
- "Update header image" → Image URL input + AI inserts
- "Fix mobile responsiveness" → AI adds mobile-friendly CSS
- "Add social icons" → AI inserts social section
- "Change font to [X]" → AI updates all font declarations

#### 4. **Template Mode**
- "Generate new email from scratch" with requirements
- "Convert current email to [Welcome/Newsletter/Promo] style"
- "Apply template structure to my content"

#### 5. **Code Quality Tools**
- "Clean up HTML" - remove unnecessary tags/whitespace
- "Validate email HTML" - check for common issues
- "Inline all CSS" - for better email client support

### Technical Implementation

#### Backend Changes (ai-email-enhance function)
Update to support new action types:
- `edit_code`: Takes HTML + natural language instruction, returns modified HTML
- `generate_section`: Creates new HTML section based on description
- `apply_template`: Restructures content into template format

```text
New System Prompt for Code Editing:
"You are an expert email HTML developer. When given HTML code and an edit request, return ONLY the complete modified HTML. Do not explain, just return the updated code. Preserve all existing structure unless explicitly asked to change it."
```

#### Frontend Changes (EmailAIEnhancer.tsx)
1. Add new "Code" tab with:
   - Edit instruction textarea
   - Quick action buttons for common edits
   - Preview of changes before applying
   - Full HTML replacement (not partial)

2. New state management:
   - `lastHtml` for undo functionality
   - `pendingHtml` for preview before apply
   - `codeAction` for tracking edit type

3. UI Components:
   - Collapsible sections for different edit types
   - Color picker integration for style changes
   - Before/after diff view

### Security Considerations
- **NO send capability** - The AI sidebar only modifies local state
- Actual sending requires:
  - Saving the campaign (separate mutation)
  - Using the test email dialog (separate flow)
  - Scheduling (separate component)
- AI has no access to send-campaign-test or process-campaign-queue functions

### Files to Modify
1. `src/components/admin/EmailAIEnhancer.tsx` - Main UI updates
2. `supabase/functions/ai-email-enhance/index.ts` - Backend logic for code editing

### UI Mockup

```text
┌─────────────────────────────────────────┐
│ ✨ AI Email Assistant                   │
│ Enhance your campaigns with AI          │
├─────────────────────────────────────────┤
│ [Enhance] [Code] [Images] [Ideas]       │
├─────────────────────────────────────────┤
│ QUICK CODE EDITS                        │
│ ┌─────────────────────────────────────┐ │
│ │ 🎨 Change Colors                    │ │
│ │ 📝 Edit Header                      │ │
│ │ 🔘 Update Button                    │ │
│ │ 📱 Make Mobile-Friendly             │ │
│ │ 🧹 Clean Up HTML                    │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ DESCRIBE YOUR EDIT                      │
│ ┌─────────────────────────────────────┐ │
│ │ "Add a second CTA button below      │ │
│ │ the main content with text          │ │
│ │ 'Start Trading Now'"                │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ [⚡ Apply Edit to Code]                 │
│                                         │
│ ┌─────────────────────────────────────┐ │
│ │ 📝 PENDING CHANGES                  │ │
│ │ Button will be added at line 45     │ │
│ │ [Preview] [Apply] [Discard]         │ │
│ └─────────────────────────────────────┘ │
└─────────────────────────────────────────┘
```

