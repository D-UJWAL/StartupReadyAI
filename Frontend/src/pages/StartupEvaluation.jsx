import { useState, useEffect, useRef } from 'react';
import api from '../api';
import { Link } from 'react-router-dom';
import {
  ArrowLeft, ArrowRight, Save, Bot, Info, Zap, BarChart3,
  CheckCircle2, AlertTriangle, TrendingUp, Shield, Loader2,
  Upload, X, FileText, Sparkles, RotateCcw, Activity, Calendar
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

// ── Rule-based score calculator ──────────────────────────────────────────────
function calcScore(fields) {
  if (!fields || typeof fields !== 'object') return 30;
  const vals = Object.values(fields).filter(v => typeof v === 'string');
  if (vals.length === 0) return 30;
  const filled = vals.filter(v => v.trim().length > 3).length;
  const pct = filled / vals.length;
  const quality = vals.filter(v => v.trim().length > 50).length;
  const qualBonus = Math.min(quality * 5, 20);
  return Math.min(Math.round(pct * 70 + qualBonus + 10), 100);
}

// ── AI Engine — rule-based, no external API required ─────────────────────────
// Generate: creates new content from step-specific templates + startup context
function aiGenerate(step, fieldName, startup, regData) {
  const name = startup?.name || 'your startup';
  const industry = startup?.industry || 'technology';
  const stage = startup?.stage || 'early stage';
  const founderNames = regData?.team
    ? regData.team.filter(m => m.name?.trim()).map(m => m.name).join(', ')
    : 'the founding team';

  const templates = {
    1: {
      summary: `${name} helps [target customers] solve [key problem] through [unique approach].`,
      elevator_pitch: `${name} is an ${stage} ${industry} venture. [Target customers] struggle with [key problem]. Our solution [mechanism] delivers [key outcome]. We currently have [traction metric]. We are raising [ask] to reach [next milestone].`,
      vision: `To become the leading platform that [long-term impact] for [beneficiaries] across [geography].`,
      mission: `To empower [target customers] with [core capability], enabling them to [key outcome] with confidence.`,
      business_model: `B2B SaaS — monthly or annual subscription per seat.`,
      hq: `[City, State, Country]`,
      sector: `[Specific sector within ${industry}]`,
      founders: founderNames,
      website: `https://www.${name.toLowerCase().replace(/\s+/g, '')}.com`,
      year_started: `${new Date().getFullYear()}`,
      employees: `1–5`,
    },
    2: {
      problem_statement: `[Target customers] currently face [specific problem]. This leads to [negative consequence], costing them [time/money]. Existing solutions fail because [gap in current market].`,
      solution: `${name} provides [product/service] that [mechanism], enabling [primary benefit] with [measurable improvement vs. current state].`,
      differentiation: `Unlike [Competitor A], which [limitation], ${name} offers [key differentiator]. Our [proprietary element] creates a [moat type] advantage.`,
      affected_users: `Approximately [X million] [customer type] in [geography] face this problem annually.`,
      frequency: `Customers encounter this problem [daily / weekly / monthly], making it high-frequency.`,
      seriousness: `This is a [critical / high / medium] severity issue because [business impact to customer].`,
      innovation: `Our key innovation is [novel element]. This is unique because no existing solution [does X in this way].`,
      pilots: `We ran [X] pilots with [customer type], achieving [key result: e.g., 40% time saved].`,
      testimonials: `"[Actual customer quote]." — [Name, Title, Company]`,
      feedback: `Average satisfaction: [X]/10 across [N] interviews. Top feedback theme: [key finding].`,
    },
    3: {
      tam: `$[X]B — total global market for [category]. Source: [Analyst report, year].`,
      sam: `$[X]M — serviceable market in [geography/segment] that we can address with current product.`,
      som: `$[X]M — realistically obtainable in [X] years based on [conversion assumptions].`,
      market_growth: `[X]% CAGR from [year] to [year]. Source: [firm].`,
      top_competitors: `1. [Competitor A] — Strength: [X], Weakness: [Y]\n2. [Competitor B] — Strength: [X], Weakness: [Y]\n3. [Competitor C] — Strength: [X], Weakness: [Y]`,
      competitive_advantages: `1. [Proprietary tech/data]: [specific advantage]\n2. [Speed/cost leadership]: [specific advantage]\n3. [Customer stickiness]: [specific advantage]`,
      segment: `[Primary segment]: [description of customer profile and buying behavior].`,
      geography: `Primary market: [Country]. Expansion targets: [Region 2], [Region 3] by [year].`,
      entry_barriers: `Key barriers include high capital requirements, regulatory approvals, proprietary data, and long enterprise sales cycles.`,
      customer_profile: `Primary buyer: [Job title] at [Company type/size], with [budget authority and problem awareness].`,
    },
    4: {
      key_features: `1. [Feature 1] — [user benefit]\n2. [Feature 2] — [user benefit]\n3. [Feature 3] — [user benefit]`,
      product_roadmap: `Q1 ${new Date().getFullYear()}: [Milestone 1]\nQ2 ${new Date().getFullYear()}: [Milestone 2]\nQ3 ${new Date().getFullYear()}: [Milestone 3]`,
      product_differentiation: `We differ from alternatives through [key dimension]. Customers choose us because [top reason].`,
      ux_notes: `User testing showed [X]% task completion rate and [X]/5 usability score. Key UX principle: [simplicity / speed / accessibility].`,
    },
    5: {
      tech_stack: `Frontend: [React/Vue]\nBackend: [FastAPI/Node]\nDatabase: [PostgreSQL/MongoDB]\nCloud: [AWS/GCP/Azure]\nOther: [Key libraries or frameworks]`,
      scalability: `Horizontal auto-scaling via [cloud provider]. Microservices architecture. Target: [X] concurrent users at launch.`,
      security: `Encryption: AES-256 at rest, TLS 1.3 in transit\nAccess: Role-based access control (RBAC)\nAudit: All admin actions logged\nTesting: Quarterly pen tests`,
      cloud_infra: `[AWS/GCP/Azure] — Key services: [compute, database, storage, CDN].`,
      database_tech: `Primary: [PostgreSQL/MySQL] for transactional data. Cache: [Redis] for sessions.`,
      auth_method: `JWT tokens with [OAuth2/SSO] integration. MFA enabled for [enterprise tier].`,
      devops: `CI/CD: [GitHub Actions/Jenkins]. Containers: [Docker]. Orchestration: [Kubernetes/ECS].`,
    },
    6: {
      pricing: `Starter: ₹[X]/month — [features]\nGrowth: ₹[X]/month — [features]\nEnterprise: Custom`,
      upsell_strategy: `After initial subscription, we upsell [add-on feature] to [X]% of customers, increasing ARPU by [X]%.`,
      expansion_plan: `Land with [initial use case], expand to [adjacent team/department/use case] within [timeline].`,
      retention_rate: `[X]% annual customer retention. Net Revenue Retention (NRR): [X]%.`,
    },
    7: {
      founder_background: `${founderNames} — [X] years of combined [domain] experience. Prior background includes [relevant experience, companies, degrees].`,
      team_skills: `Engineering: [X] engineers — [key skills]\nProduct: [X] PMs — [skills]\nSales: [X] reps — [background]`,
      advisors: `1. [Name] — [Expertise] — [Institution]\n2. [Name] — [Expertise] — [Institution]`,
      hiring_plan: `Next 6 months:\n- [Role] — [reason]\n- [Role] — [reason]`,
    },
    8: {
      financial_notes: `MoM revenue growth: [X]%. LTV:CAC ratio: [X]x. Gross margin: [X]%. Key upcoming milestone: [event].`,
      revenue_3yr: `Year 1: ₹[X]L | Year 2: ₹[X]Cr | Year 3: ₹[X]Cr`,
      expenses_3yr: `Year 1: ₹[X]L | Year 2: ₹[X]L | Year 3: ₹[X]Cr`,
    },
    9: {
      agreements: `Founder agreement: [Signed / Pending]\nShareholder agreement: [Signed / Pending]\nNDA template: [Yes / No]\nIP assignment: [Signed / Pending]`,
      compliance_notes: `DPDP Act: [In progress / Complete]. GDPR: [Applicable / N/A]. Industry-specific: [List regulations].`,
      ip_status: `Trademark: [Filed / Registered / Not filed]\nPatent: [Filed / Granted / Not filed]\nCopyright: [Registered / Not filed]`,
    },
    10: {
      sales_channels: `1. Direct outbound — targeting [segment]\n2. Inbound / content marketing — [channel]\n3. Partner / reseller — [type]\n4. Marketplace listing — [platform]`,
      gtm_strategy: `Phase 1 (Month 1–3): Direct outreach to [X] accounts in [segment].\nPhase 2 (Month 4–6): Launch partner program.\nPhase 3: Scale inbound with content and community.`,
      seo_presence: `Organic traffic: [X] monthly visitors. Target keywords: [list]. Domain authority: [X].`,
      digital_marketing_channels: `Active: [LinkedIn / Google Ads / Instagram]. Monthly budget: ₹[X]. Digital CAC: ₹[X].`,
      partnerships: `1. [Partner A] — [type, expected value]\n2. [Partner B] — [type, expected value]`,
    },
    11: {
      key_milestones: `- [Date]: Product launched\n- [Date]: First paying customer\n- [Date]: [X] customers milestone\n- [Date]: Partnership signed\n- [Date]: Award received`,
      media_coverage: `Featured in: [Publication] ([date]), [Publication] ([date]). Total reach: [X] impressions.`,
    },
    12: {
      social_impact: `${name} creates impact by [mechanism]. To date: [X jobs created / Y communities served / Z beneficiaries].`,
      environmental_impact: `Sustainability practices: [list]. Estimated footprint: [low/medium/high]. Net zero target: [year / N/A].`,
      governance: `Board: [X members, X independent]. Meetings: Monthly. Code of conduct: [Published / In progress].`,
    },
    13: {
      use_of_funds: `Product development: [X]%\nSales & Marketing: [X]%\nTeam & Operations: [X]%\nLegal & Compliance: [X]%\nWorking capital: [X]%`,
      investor_types: `Target: [Angel networks / Sector VCs / Family offices / Government grants]. Ticket: ₹[X]–₹[X]Cr.`,
      runway_post_funding: `[X] months runway with this raise, reaching [key milestone] by [date].`,
    },
    14: {
      market_risk: `Risk: [Specific market risk]\nLikelihood: [High/Medium/Low]\nMitigation: [Specific action taken or planned]\nStatus: [In progress / Complete]`,
      competition_risk: `Risk: [Specific competitive threat]\nMitigation: [Defensive strategy — deep focus, switching costs, IP]\nStatus: [In progress / Complete]`,
      technology_risk: `Risk: [Scaling / security / integration risk]\nMitigation: [Architecture decision or testing plan]\nStatus: [In progress / Complete]`,
      financial_risk: `Risk: [Cash flow / burn rate]\nMitigation: [Revenue milestone or cost control plan]\nStatus: [In progress / Complete]`,
      regulatory_risk: `Risk: [Regulatory change exposure]\nMitigation: [Compliance roadmap, legal counsel engaged]\nStatus: [In progress / Complete]`,
      contingency_plans: `Primary: [Action for key risk]\nBackup: [Secondary strategy]\nEmergency reserve: ₹[X] set aside.`,
    },
  };

  return templates[step]?.[fieldName]
    || `Describe your ${fieldName.replace(/_/g, ' ')} here. Include specific data, metrics, and evidence where possible.`;
}

// Improve: adds structure and specificity prompts to existing content
function aiImprove(text) {
  if (!text || text.trim().length < 5) return null;
  const t = text.trim();
  const lines = t.split('\n').filter(l => l.trim());
  if (lines.length === 1 && t.length > 40) {
    return `${t}\n\nSuggested structural improvements:\n• Add a specific metric to quantify the claim above\n• State the direct benefit to your target customer\n• Include a comparison to the current alternative\n\n[Apply this, then replace the bullets above with your actual data]`;
  }
  return t + '\n\n[AI Improvement: Quantify each point with real numbers — percentages, currency amounts, or time savings. Investors trust evidence over assertions.]';
}

// Rewrite: restructures content with investor-first framing (conclusion first)
function aiRewrite(text) {
  if (!text || text.trim().length < 10) return null;
  const t = text.trim();
  const sentences = t.split(/(?<=[.!?])\s+/).filter(s => s.trim().length > 5);
  if (sentences.length < 2) {
    return `Alternative investor-ready version:\n\n"The core value delivered is: ${t.toLowerCase().replace(/^(we |our )/i, '')}. This directly solves [specific pain point] and delivers [measurable outcome] for [target customer]."\n\n[Edit bracketed items with your actual specifics]`;
  }
  const reordered = [sentences[sentences.length - 1].trim(), ...sentences.slice(0, -1).map(s => s.trim())];
  return `Alternative version (leads with outcome — more investor-friendly):\n\n${reordered.join('. ')}.`;
}

// ── Step field definitions ────────────────────────────────────────────────────
const STEP_CONFIG = {
  1: { title: 'Startup Overview', helpText: "Helps investors quickly understand your core business, structure, and foundational vision.", fields: [
    { name: 'summary', label: 'One-Sentence Summary *', type: 'text', placeholder: 'We help X do Y through Z', required: true },
    { name: 'elevator_pitch', label: 'Elevator Pitch (30–60 sec)', type: 'textarea', placeholder: 'Describe your startup as if speaking to an investor…' },
    { name: 'vision', label: 'Vision *', type: 'textarea', placeholder: 'What long-term impact do you want to create?', required: true },
    { name: 'mission', label: 'Mission', type: 'textarea', placeholder: 'How will you achieve your vision?' },
    { name: 'business_model', label: 'Business Model', type: 'text', placeholder: 'B2B SaaS, Marketplace, D2C…' },
    { name: 'sector', label: 'Sector', type: 'text', placeholder: 'E.g. Financial Technology, Health Analytics…' },
    { name: 'founders', label: 'Founder(s)', type: 'text', placeholder: 'Full name(s) of founders' },
    { name: 'hq', label: 'Headquarters', type: 'text', placeholder: 'City, State, Country' },
    { name: 'website', label: 'Website', type: 'text', placeholder: 'https://www.startup.com' },
    { name: 'year_started', label: 'Year Started', type: 'text', placeholder: '2023' },
    { name: 'employees', label: 'Current Team Size', type: 'text', placeholder: '5' },
  ]},
  2: { title: 'Problem & Solution Validation', helpText: "Helps assess whether the startup is solving a clear and meaningful customer problem.", fields: [
    { name: 'problem_statement', label: 'Problem Statement *', type: 'textarea', placeholder: 'Clearly define the problem and who faces it…', required: true },
    { name: 'affected_users', label: 'Affected Users / Scale', type: 'text', placeholder: '50 million SMEs struggle with…' },
    { name: 'frequency', label: 'Problem Frequency', type: 'text', placeholder: 'Daily / Weekly / Monthly' },
    { name: 'seriousness', label: 'Problem Seriousness', type: 'text', placeholder: 'Critical / High / Medium — and why' },
    { name: 'solution', label: 'Your Solution *', type: 'textarea', placeholder: 'How does your product/service solve this?', required: true },
    { name: 'differentiation', label: 'Key Differentiators *', type: 'textarea', placeholder: 'What makes your solution better than alternatives?', required: true },
    { name: 'innovation', label: 'Innovation / Novelty', type: 'textarea', placeholder: 'What is genuinely new or innovative about your approach?' },
    { name: 'ip_overview', label: 'IP / Proprietary Elements', type: 'text', placeholder: 'Patent filed, proprietary algorithm, exclusive data…' },
    { name: 'customer_interviews', label: 'Customer Interviews Conducted', type: 'text', placeholder: '25+' },
    { name: 'pilots', label: 'Pilots / Proof of Concepts', type: 'text', placeholder: '3 pilots with enterprise clients, 2 ongoing' },
    { name: 'testimonials', label: 'Key Testimonials / Feedback', type: 'textarea', placeholder: 'Notable customer quotes or validation data…' },
    { name: 'feedback', label: 'Aggregate Customer Feedback', type: 'textarea', placeholder: 'Summary of interview themes, satisfaction scores…' },
  ]},
  3: { title: 'Market Opportunity', helpText: "Helps estimate whether the market is large enough to support meaningful business growth.", fields: [
    { name: 'tam', label: 'Total Addressable Market (TAM) *', type: 'text', placeholder: '$50B global SaaS market', required: true },
    { name: 'sam', label: 'Serviceable Addressable Market (SAM)', type: 'text', placeholder: '$5B India mid-market' },
    { name: 'som', label: 'Serviceable Obtainable Market (SOM)', type: 'text', placeholder: '$200M in 3 years' },
    { name: 'market_growth', label: 'Market Growth Rate', type: 'text', placeholder: '18% CAGR' },
    { name: 'segment', label: 'Primary Segment', type: 'text', placeholder: 'SME manufacturers, enterprise HR teams…' },
    { name: 'geography', label: 'Target Geography', type: 'text', placeholder: 'India-first, then SEA and Middle East' },
    { name: 'top_competitors', label: 'Top 3 Competitors', type: 'textarea', placeholder: 'Competitor A: …\nCompetitor B: …' },
    { name: 'competitive_advantages', label: 'Your Competitive Advantages *', type: 'textarea', placeholder: 'Speed, cost, proprietary data, network effects…', required: true },
    { name: 'entry_barriers', label: 'Entry Barriers', type: 'textarea', placeholder: 'What makes it hard for new entrants to compete?' },
    { name: 'customer_profile', label: 'Customer / Buyer / Decision Maker', type: 'textarea', placeholder: 'Who buys, who uses, who decides?' },
  ]},
  4: { title: 'Product Readiness', helpText: "Helps evaluate product maturity, user engagement, and roadmap feasibility.", fields: [
    { name: 'product_status', label: 'Product Status *', type: 'select', options: ['Concept','Wireframe','Prototype','Beta','Live / Production','Scaling'], required: true },
    { name: 'key_features', label: 'Key Features (Top 3–5) *', type: 'textarea', placeholder: '1. AI-powered dashboard\n2. Real-time analytics…', required: true },
    { name: 'product_differentiation', label: 'Product Differentiation', type: 'textarea', placeholder: 'How does your product differ from alternatives?' },
    { name: 'ux_notes', label: 'UX / Design Approach', type: 'textarea', placeholder: 'Mobile-first, accessibility, key design decisions…' },
    { name: 'registered_users', label: 'Registered Users', type: 'text', placeholder: '1,200' },
    { name: 'active_users', label: 'Monthly Active Users (MAU)', type: 'text', placeholder: '350' },
    { name: 'dau', label: 'Daily Active Users (DAU)', type: 'text', placeholder: '85' },
    { name: 'product_roadmap', label: 'Next 6-Month Roadmap', type: 'textarea', placeholder: 'Q1: Mobile app launch\nQ2: API integrations…' },
    { name: 'demo_link', label: 'Demo / Product Link', type: 'text', placeholder: 'https://demo.startup.com' },
  ]},
  5: { title: 'Technology Assessment', helpText: "Helps evaluate technical maturity, scalability, and technology risk.", fields: [
    { name: 'tech_stack', label: 'Technology Stack *', type: 'textarea', placeholder: 'Frontend: React\nBackend: FastAPI\nDB: PostgreSQL\nCloud: AWS…', required: true },
    { name: 'cloud_infra', label: 'Cloud Infrastructure', type: 'text', placeholder: 'AWS / GCP / Azure — key services used' },
    { name: 'database_tech', label: 'Database Technology', type: 'text', placeholder: 'PostgreSQL (primary), Redis (cache)' },
    { name: 'apis_used', label: 'Key APIs / Integrations', type: 'text', placeholder: 'Payment gateway, email, CRM, analytics…' },
    { name: 'auth_method', label: 'Authentication / Authorization', type: 'text', placeholder: 'JWT, OAuth2, SSO, MFA…' },
    { name: 'encryption_method', label: 'Encryption', type: 'text', placeholder: 'AES-256 at rest, TLS 1.3 in transit' },
    { name: 'security', label: 'Security Measures', type: 'textarea', placeholder: 'RBAC, audit logs, pen testing, VAPT…' },
    { name: 'scalability', label: 'Scalability Approach', type: 'textarea', placeholder: 'Auto-scaling, microservices, CDN…' },
    { name: 'audit_logs', label: 'Audit Logs', type: 'text', placeholder: 'All sensitive actions logged / Not implemented yet' },
    { name: 'ha_strategy', label: 'High Availability', type: 'text', placeholder: '99.9% SLA, multi-AZ deployment' },
    { name: 'dr_strategy', label: 'Disaster Recovery', type: 'text', placeholder: 'Daily backups, RTO < 4 hours, RPO < 1 hour' },
    { name: 'ai_ml', label: 'AI / ML Integration', type: 'text', placeholder: 'Yes – recommendation engine / N/A' },
    { name: 'devops', label: 'DevOps / CI-CD Pipeline', type: 'text', placeholder: 'GitHub Actions + Docker + Kubernetes' },
    { name: 'compliance', label: 'Compliance Standards', type: 'text', placeholder: 'ISO 27001, SOC2, GDPR, DPDP…' },
  ]},
  6: { title: 'Business Model', helpText: "Helps assess how the startup plans to generate sustainable revenue.", fields: [
    { name: 'revenue_model', label: 'Revenue Model *', type: 'select', options: ['SaaS Subscription','Marketplace','Transactional Fee','Licensing','Freemium','D2C','Advertising','Other'], required: true },
    { name: 'pricing', label: 'Pricing Tiers', type: 'textarea', placeholder: 'Starter: ₹999/mo\nPro: ₹2,999/mo\nEnterprise: Custom' },
    { name: 'cac', label: 'Customer Acquisition Cost (CAC)', type: 'text', placeholder: '₹1,500' },
    { name: 'ltv', label: 'Customer Lifetime Value (LTV)', type: 'text', placeholder: '₹15,000' },
    { name: 'gross_margin', label: 'Gross Margin %', type: 'text', placeholder: '68%' },
    { name: 'churn_rate', label: 'Monthly Churn Rate', type: 'text', placeholder: '3%' },
    { name: 'retention_rate', label: 'Annual Retention Rate', type: 'text', placeholder: '85% annual retention' },
    { name: 'upsell_strategy', label: 'Upsell / Cross-sell Strategy', type: 'textarea', placeholder: 'After initial subscription, we offer…' },
    { name: 'expansion_plan', label: 'Expansion Revenue Plan', type: 'textarea', placeholder: 'Land-and-expand: start with team, expand to enterprise…' },
  ]},
  7: { title: 'Team Assessment', helpText: "Helps evaluate the founding team's experience, execution capability, and founder-market fit.", fields: [
    { name: 'founder_background', label: 'Founder Background *', type: 'textarea', placeholder: 'Domain expertise, prior startups, technical/business skills…', required: true },
    { name: 'team_skills', label: 'Core Team Skills', type: 'textarea', placeholder: 'Tech lead: 8yrs, full-stack. Marketing: ex-Google…' },
    { name: 'tech_team_size', label: 'Technology Team', type: 'text', placeholder: '3 engineers (1 senior, 2 mid-level)' },
    { name: 'sales_team_info', label: 'Sales Team', type: 'text', placeholder: '2 sales reps + 1 sales lead' },
    { name: 'marketing_team_info', label: 'Marketing Team', type: 'text', placeholder: '1 marketing manager (part-time)' },
    { name: 'current_roles', label: 'Current Key Positions', type: 'textarea', placeholder: 'CEO: [Name] — [background]\nCTO: [Name] — [background]' },
    { name: 'advisors', label: 'Advisors / Mentors', type: 'textarea', placeholder: 'Name – Role – Institution/Company' },
    { name: 'hiring_plan', label: '6-Month Hiring Plan', type: 'textarea', placeholder: 'Q1: Backend engineer\nQ2: Sales lead…' },
    { name: 'key_gaps', label: 'Key Skill Gaps', type: 'text', placeholder: 'Need CFO and enterprise sales lead' },
  ]},
  8: { title: 'Financial Readiness', helpText: "Helps assess financial health, sustainability, burn, runway, and investment readiness.", fields: [
    { name: 'annual_revenue', label: 'Annual Revenue (Current FY)', type: 'text', placeholder: '₹45L' },
    { name: 'monthly_revenue', label: 'Current Monthly Revenue', type: 'text', placeholder: '₹4L/month' },
    { name: 'monthly_burn', label: 'Monthly Burn Rate', type: 'text', placeholder: '₹8L/month' },
    { name: 'runway_months', label: 'Current Runway (Months)', type: 'text', placeholder: '9 months' },
    { name: 'profitability_status', label: 'Profitability Status', type: 'select', options: ['Pre-revenue','Revenue — not yet profitable','EBITDA positive','Net profitable'] },
    { name: 'ebitda', label: 'EBITDA (if applicable)', type: 'text', placeholder: '₹-5L/month (negative) or ₹3L/month (positive)' },
    { name: 'gross_margin_pct', label: 'Gross Margin %', type: 'text', placeholder: '65%' },
    { name: 'revenue_forecast_1yr', label: '1-Year Revenue Forecast', type: 'text', placeholder: '₹2.5Cr' },
    { name: 'revenue_3yr', label: '3-Year Revenue Projection', type: 'text', placeholder: 'Y1: ₹2.5Cr | Y2: ₹7Cr | Y3: ₹15Cr' },
    { name: 'expenses_3yr', label: '3-Year Expense Projection', type: 'text', placeholder: 'Y1: ₹3Cr | Y2: ₹6Cr | Y3: ₹10Cr' },
    { name: 'cash_flow_notes', label: 'Cash Flow Notes', type: 'textarea', placeholder: 'Working capital position, receivables, payables…' },
    { name: 'break_even', label: 'Break-Even Timeline', type: 'text', placeholder: 'Month 18 from now' },
    { name: 'financial_notes', label: 'Key Financial Highlights', type: 'textarea', placeholder: 'MoM growth, key milestones, unit economics…' },
  ]},
  9: { title: 'Legal & Compliance', helpText: "Helps identify legal documentation and compliance gaps that could create investor or operational risk.", fields: [
    { name: 'incorporation_status', label: 'Incorporation Status *', type: 'select', options: ['Incorporated','Not Incorporated','In Progress'], required: true },
    { name: 'company_type', label: 'Company Type', type: 'select', options: ['Private Limited','LLP','One Person Company','Partnership Firm','Sole Proprietorship','Not incorporated'] },
    { name: 'gst_number', label: 'GST Number', type: 'text', placeholder: '27AAAAA0000A1Z5 or Not registered' },
    { name: 'pan_number', label: 'Company PAN', type: 'text', placeholder: 'AADCC1234M' },
    { name: 'cin_number', label: 'CIN Number', type: 'text', placeholder: 'U12345MH2023PTC… or N/A' },
    { name: 'agreements', label: 'Key Legal Agreements in Place', type: 'textarea', placeholder: 'Founder agreement, shareholder agreement, NDAs…' },
    { name: 'shareholder_agreement', label: 'Shareholder Agreement', type: 'select', options: ['Signed','Pending','Not applicable'] },
    { name: 'esop_status', label: 'ESOP Policy', type: 'select', options: ['Yes — implemented','Planned','Not yet'] },
    { name: 'ip_status', label: 'IP / Patents / Trademarks', type: 'textarea', placeholder: '2 patents filed, trademark registered…' },
    { name: 'trademark_status', label: 'Trademark', type: 'select', options: ['Registered','Filed — pending','Not filed'] },
    { name: 'patent_status', label: 'Patent', type: 'select', options: ['Granted','Filed — pending','Not filed'] },
    { name: 'data_privacy', label: 'Privacy Policy', type: 'select', options: ['Yes — Published','Yes — Internal only','In Progress','Not Yet'] },
    { name: 'tos_status', label: 'Terms of Service', type: 'select', options: ['Yes — Published','In Progress','Not Yet'] },
    { name: 'startup_india_status', label: 'Startup India / DPIIT Recognition', type: 'select', options: ['DPIIT Recognized','Applied','Not applied'] },
    { name: 'dpdp_compliance', label: 'DPDP Act Compliance', type: 'select', options: ['Compliant','In progress','Not started','Not applicable'] },
    { name: 'iso_status', label: 'ISO Certification', type: 'select', options: ['ISO 27001 certified','In progress','Not applicable'] },
    { name: 'soc2_status', label: 'SOC2 Certification', type: 'select', options: ['SOC2 certified','In progress','Not applicable'] },
    { name: 'compliance_notes', label: 'Compliance Notes', type: 'textarea', placeholder: 'DPDP Act compliance plan, GDPR notes…' },
  ]},
  10: { title: 'Sales & GTM Strategy', helpText: "Helps assess the startup's ability to acquire customers and scale revenue.", fields: [
    { name: 'sales_channels', label: 'Primary Sales Channels *', type: 'textarea', placeholder: 'Direct sales, inbound, partnerships, marketplaces…', required: true },
    { name: 'sales_team_size', label: 'Sales Team Size', type: 'text', placeholder: '2 SDRs + 1 AE' },
    { name: 'sales_cycle', label: 'Average Sales Cycle', type: 'text', placeholder: '45 days (enterprise), 7 days (SME)' },
    { name: 'conversion_rate', label: 'Lead-to-Customer Conversion Rate', type: 'text', placeholder: '8%' },
    { name: 'seo_presence', label: 'SEO / Organic Presence', type: 'text', placeholder: 'Monthly organic traffic, domain authority…' },
    { name: 'digital_marketing_channels', label: 'Digital Marketing Channels', type: 'text', placeholder: 'LinkedIn Ads, Google Ads, Instagram…' },
    { name: 'gtm_strategy', label: 'Go-to-Market Strategy *', type: 'textarea', placeholder: 'Phase 1: Direct outreach to top 200 target accounts…', required: true },
    { name: 'partnerships', label: 'Key Partnerships / Distribution', type: 'textarea', placeholder: 'Partner A – distribution, Partner B – co-sell…' },
    { name: 'referral_program', label: 'Referral / Word-of-mouth', type: 'text', placeholder: 'Referral program details or N/A' },
    { name: 'cac_by_channel', label: 'CAC by Channel', type: 'text', placeholder: 'Organic: ₹500 | Paid: ₹3,000 | Events: ₹8,000' },
    { name: 'customer_retention_rate', label: 'Customer Retention Rate', type: 'text', placeholder: '85% annual' },
    { name: 'repeat_purchase_rate', label: 'Repeat / Upsell Rate', type: 'text', placeholder: '40% of customers expand within 12 months' },
  ]},
  11: { title: 'Traction & Growth', helpText: "Helps demonstrate market acceptance through customers, revenue, growth, and partnerships.", fields: [
    { name: 'total_customers', label: 'Total Paying Customers', type: 'text', placeholder: '85' },
    { name: 'mrr', label: 'Current MRR', type: 'text', placeholder: '₹4.2L' },
    { name: 'arr', label: 'Current ARR', type: 'text', placeholder: '₹50L' },
    { name: 'mom_growth', label: 'MoM Revenue Growth Rate', type: 'text', placeholder: '12%' },
    { name: 'yoy_growth', label: 'YoY Growth Rate', type: 'text', placeholder: '180%' },
    { name: 'total_transactions', label: 'Total Transactions (if applicable)', type: 'text', placeholder: '12,500 transactions processed' },
    { name: 'key_milestones', label: 'Key Traction Milestones', type: 'textarea', placeholder: 'First enterprise customer, partnership signed, award won…' },
    { name: 'key_partnerships', label: 'Strategic Partnerships', type: 'text', placeholder: 'Partner A, Partner B…' },
    { name: 'awards_recognition', label: 'Awards / Recognitions', type: 'text', placeholder: 'Top 10 Startup — TechSparks 2024…' },
    { name: 'media_coverage', label: 'Media / PR Coverage', type: 'textarea', placeholder: 'Featured in YourStory, TechCrunch India, ET…' },
  ]},
  12: { title: 'ESG & Social Impact', helpText: "Helps assess environmental, social, and governance considerations.", fields: [
    { name: 'environmental_impact', label: 'Environmental Impact', type: 'textarea', placeholder: 'Carbon footprint reduction, sustainable practices…' },
    { name: 'social_impact', label: 'Social Impact', type: 'textarea', placeholder: 'Jobs created, communities served, inclusivity…' },
    { name: 'governance', label: 'Governance Structure', type: 'textarea', placeholder: 'Board composition, advisory board, code of conduct…' },
    { name: 'women_leadership', label: 'Women in Leadership', type: 'text', placeholder: '2 of 5 founders are women' },
    { name: 'inclusive_hiring', label: 'Inclusive Hiring Practices', type: 'text', placeholder: 'Diversity targets, inclusive job descriptions…' },
    { name: 'accessibility', label: 'Product Accessibility', type: 'text', placeholder: 'WCAG 2.1 compliant, screen-reader support, regional language…' },
    { name: 'sdg_goals', label: 'UN SDGs Addressed', type: 'text', placeholder: 'SDG 4 (Education), SDG 8 (Decent Work)' },
  ]},
  13: { title: 'Investment Readiness', helpText: "Helps determine how prepared the startup is for fundraising and investor due diligence.", fields: [
    { name: 'funding_raised', label: 'Total Funding Raised to Date', type: 'text', placeholder: '₹50L seed from 3 angels' },
    { name: 'current_valuation', label: 'Current Valuation', type: 'text', placeholder: '₹5Cr pre-money' },
    { name: 'funding_ask', label: 'Funding Required *', type: 'text', placeholder: '₹2Cr', required: true },
    { name: 'use_of_funds', label: 'Use of Funds *', type: 'textarea', placeholder: '40% product, 35% sales/marketing, 25% ops…', required: true },
    { name: 'runway_post_funding', label: 'Runway After Funding', type: 'text', placeholder: '18 months — takes us to Series A milestone' },
    { name: 'investor_types', label: 'Preferred Investor Profile', type: 'text', placeholder: 'Angel networks, sector-focused VCs, government grants' },
    { name: 'cap_table_ready', label: 'Cap Table Status', type: 'select', options: ['Up to date — ready to share','Needs updating','Not prepared yet'] },
    { name: 'pitch_deck_ready', label: 'Pitch Deck Status', type: 'select', options: ['Ready to share','Draft — in progress','Not started'] },
    { name: 'data_room_ready', label: 'Data Room / Due Diligence Materials', type: 'select', options: ['Fully prepared','Partially ready','Not started'] },
    { name: 'due_diligence_ready', label: 'Overall Due Diligence Readiness', type: 'select', options: ['Yes — fully prepared','Partially ready','Not started'] },
  ]},
  14: { title: 'Risk Assessment', helpText: "Helps identify major risks and whether appropriate mitigation plans exist.", fields: [
    { name: 'market_risk', label: 'Market Risk & Mitigation *', type: 'textarea', placeholder: 'Risk: Market not ready. Mitigation: Early pilots confirmed demand…', required: true },
    { name: 'competition_risk', label: 'Competition Risk & Mitigation', type: 'textarea', placeholder: 'Risk: Large player entry. Mitigation: Deep vertical focus…' },
    { name: 'technology_risk', label: 'Technology Risk & Mitigation', type: 'textarea', placeholder: 'Risk: Scaling bottlenecks. Mitigation: Cloud-native architecture…' },
    { name: 'financial_risk', label: 'Financial Risk & Mitigation', type: 'textarea', placeholder: 'Risk: Burn rate. Mitigation: Revenue milestone before next raise…' },
    { name: 'regulatory_risk', label: 'Regulatory Risk & Mitigation', type: 'textarea', placeholder: 'Risk: Data privacy laws. Mitigation: DPDP compliance engaged…' },
    { name: 'operational_risk', label: 'Operational Risk & Mitigation', type: 'textarea', placeholder: 'Risk: Key person dependency. Mitigation: Documentation, cross-training…' },
    { name: 'cybersecurity_risk', label: 'Cybersecurity Risk & Mitigation', type: 'textarea', placeholder: 'Risk: Data breach. Mitigation: Pen testing, VAPT, encryption…' },
    { name: 'founder_dependency_risk', label: 'Founder Dependency Risk', type: 'textarea', placeholder: 'Risk: Critical knowledge in one person. Mitigation: Documentation, cross-training…' },
    { name: 'key_controls', label: 'Key Risk Controls in Place', type: 'textarea', placeholder: 'Insurance, legal agreements, financial controls, audit trails…' },
    { name: 'contingency_plans', label: 'Contingency Plans', type: 'textarea', placeholder: 'Plan A: … Plan B: … Emergency reserve: ₹[X]…' },
    { name: 'overall_risk_rating', label: 'Overall Risk Rating', type: 'select', options: ['Low','Medium','High','Very High'] },
  ]},
};

// ── Required fields per step ──────────────────────────────────────────────────
const REQUIRED_FIELDS = {
  1: ['summary', 'vision'],
  2: ['problem_statement', 'solution', 'differentiation'],
  3: ['tam', 'competitive_advantages'],
  4: ['product_status', 'key_features'],
  5: ['tech_stack'],
  6: ['revenue_model'],
  7: ['founder_background'],
  8: [],
  9: ['incorporation_status'],
  10: ['sales_channels', 'gtm_strategy'],
  11: [],
  12: [],
  13: ['funding_ask', 'use_of_funds'],
  14: ['market_risk'],
};

// ── Primary AI-targeted field per step (first meaningful textarea) ────────────
const AI_PRIMARY_FIELD = {
  1: 'elevator_pitch', 2: 'problem_statement', 3: 'competitive_advantages',
  4: 'key_features',   5: 'tech_stack',        6: 'pricing',
  7: 'founder_background', 8: 'financial_notes', 9: 'compliance_notes',
  10: 'gtm_strategy',  11: 'key_milestones',   12: 'social_impact',
  13: 'use_of_funds',  14: 'market_risk',
};

// ── Uploads for evaluation steps ─────────────────────────────────────────────
const STEP_UPLOADS = {
  2:  [{ key: 'eval_validation_evidence', label: 'Customer Interview Evidence', hint: 'PDF/PNG/JPG' }],
  4:  [{ key: 'eval_product_screenshots', label: 'Product Screenshots / Demo', hint: 'PDF/PNG/JPG' },
       { key: 'eval_demo_video',          label: 'Demo Video',                 hint: 'MP4 (optional)' }],
  8:  [{ key: 'eval_financial_model',     label: 'Financial Model / Projections', hint: 'XLSX/PDF' }],
  13: [{ key: 'eval_pitch_deck',          label: 'Pitch Deck',                 hint: 'PDF/PPTX' },
       { key: 'eval_cap_table',           label: 'Cap Table',                  hint: 'XLSX/PDF' }],
};

const ALLOWED_TYPES = '.pdf,.docx,.pptx,.xlsx,.png,.jpg,.jpeg,.mp4';

// ── Sidebar tips per step ─────────────────────────────────────────────────────
const STEP_TIPS = {
  1: 'Be concise and specific. Investors spend under 30 seconds on an overview. Make every word count.',
  2: "Use data and evidence. '3 of 5 interviewed users said X' is stronger than 'many users said X'.",
  3: 'TAM should be backed by credible sources. Use bottom-up market sizing for credibility.',
  4: 'Include screenshots or a live demo link. Showing beats telling.',
  5: 'Explain how your tech stack provides a competitive moat. Avoid buzzwords without substance.',
  6: 'State LTV:CAC ratio. A ratio > 3x is generally investor-friendly.',
  7: 'Highlight relevant domain expertise, not just titles. Investors bet on the team.',
  8: 'Show MoM trends. Even early revenue growth signals strong product-market fit.',
  9: 'Legal clarity builds trust. Unresolved IP issues are major red flags for investors.',
  10: 'Be specific about your GTM. Vague strategies reduce investor confidence.',
  11: 'Numbers speak loudest. Quantify growth wherever possible.',
  12: 'ESG factors are increasingly scrutinized by institutional investors.',
  13: 'Specific use of funds shows financial maturity. Break it down by category and percentage.',
  14: 'Identifying risks proactively builds credibility. Show you have thought through mitigation.',
};

// ── Main component ────────────────────────────────────────────────────────────
export default function StartupEvaluation() {
  const [step, setStep]               = useState(1);
  const [savedEvals, setSavedEvals]   = useState({});
  const [stepFields, setStepFields]   = useState({});
  const [startup, setStartup]         = useState(null);
  const [regData, setRegData]         = useState(null);
  const [result, setResult]           = useState(null);
  const [loadingResult, setLoadingResult] = useState(false);
  const [isSaving, setIsSaving]       = useState(false);
  const [successMsg, setSuccessMsg]   = useState('');
  const [error, setError]             = useState('');
  const [validationErrors, setValidationErrors] = useState({});
  const [uploads, setUploads]         = useState({});
  const [uploadingKey, setUploadingKey] = useState(null);
  const [aiLoading, setAiLoading]     = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState(null);
  const [recAiLoading, setRecAiLoading] = useState(null);
  const [recAiResult, setRecAiResult] = useState({});
  const [showHelp, setShowHelp] = useState(false);

  const { user } = useAuth();
  const TOTAL = 15;

  // Refs to prevent stale closures in autosave interval
  const stepRef       = useRef(step);
  const fieldsRef     = useRef(stepFields);
  const isDirty       = useRef(false);
  const fileInputRefs = useRef({});

  useEffect(() => { stepRef.current = step; },       [step]);
  useEffect(() => { fieldsRef.current = stepFields; }, [stepFields]);

  // ── Re-fetch latest results every time Step 15 becomes active ────────────
  useEffect(() => {
    if (step === 15 && user?.startup_id) {
      fetchResult();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, user?.startup_id]);

  // ── Load data on mount ──────────────────────────────────────────────────
  useEffect(() => {
    if (!user?.startup_id) return;

    // Load startup + registration data (for AI pre-fill)
    api.get('/api/startups').then(res => {
      if (res.data[0]) {
        const s = res.data[0];
        setStartup(s);
        try { if (s.registration_data) setRegData(JSON.parse(s.registration_data)); } catch {}
      }
    }).catch(() => {});

    // Load saved evaluation steps
    api.get('/api/evaluations').then(res => {
      const saved = {};
      const fields = {};
      let maxStep = 0;
      res.data.forEach(ev => {
        saved[ev.step] = ev;
        try { fields[ev.step] = JSON.parse(ev.data); } catch { fields[ev.step] = {}; }
        if (ev.step > maxStep) maxStep = ev.step;
      });
      setSavedEvals(saved);
      setStepFields(fields);
      if (maxStep > 0) setStep(Math.min(maxStep + 1, TOTAL));
      if (maxStep >= 14) fetchResult();
    }).catch(() => {});

    // Load existing document uploads
    api.get('/api/uploads').then(res => {
      const map = {};
      res.data.forEach(d => { map[d.doc_type] = d; });
      setUploads(map);
    }).catch(() => {});
  }, [user?.startup_id]);

  // ── Autosave every 60 seconds (quiet — no toast) ─────────────────────────
  useEffect(() => {
    if (!user?.startup_id) return;
    const timer = setInterval(async () => {
      const s = stepRef.current;
      if (s >= 15 || !isDirty.current) return;
      const fields = fieldsRef.current[s] || {};
      const hasData = Object.values(fields).some(v => typeof v === 'string' && v.trim().length > 0);
      if (!hasData) return;
      try {
        const score = calcScore(fields);
        await api.post('/api/evaluations', { step: s, score, data: JSON.stringify(fields) });
        setSavedEvals(prev => ({ ...prev, [s]: { step: s, score, data: JSON.stringify(fields) } }));
        isDirty.current = false;
      } catch { /* silent autosave — ignore network hiccups */ }
    }, 60000);
    return () => clearInterval(timer);
  }, [user?.startup_id]);

  const fetchResult = async () => {
    setLoadingResult(true);
    try {
      const res = await api.get('/api/evaluations/result');
      setResult(res.data);
    } catch (e) { console.error(e); }
    finally { setLoadingResult(false); }
  };

  // ── PDF report download ─────────────────────────────────────────────────
  const [isPdfDownloading, setIsPdfDownloading] = useState(false);

  const downloadReport = async () => {
    setIsPdfDownloading(true);
    try {
      const res = await api.get('/api/evaluations/report', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = `StartupReady_AI_Evaluation_Report_${startup?.name?.replace(/\s+/g, '_') || 'Report'}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (e) {
      setError('Failed to generate PDF report. Please try again.');
      console.error(e);
    } finally {
      setIsPdfDownloading(false);
    }
  };

  // ── Field helpers ───────────────────────────────────────────────────────
  const currentFields = stepFields[step] || {};

  const setField = (name, value) => {
    isDirty.current = true;
    if (validationErrors[name]) {
      setValidationErrors(prev => { const n = { ...prev }; delete n[name]; return n; });
    }
    setStepFields(prev => ({ ...prev, [step]: { ...(prev[step] || {}), [name]: value } }));
  };

  // ── Validation (only required fields, no data destruction) ─────────────
  const validate = () => {
    const required = REQUIRED_FIELDS[step] || [];
    const fields = stepFields[step] || {};
    const errors = {};
    required.forEach(name => {
      if (!(fields[name] || '').trim()) {
        const cfg = STEP_CONFIG[step]?.fields.find(f => f.name === name);
        const label = (cfg?.label || name).replace(' *', '').replace(/_/g, ' ');
        errors[name] = `${label} is required.`;
      }
    });
    setValidationErrors(errors);
    if (Object.keys(errors).length > 0) {
      // Focus the first field with an error
      const firstKey = Object.keys(errors)[0];
      const el = document.getElementById(`field-${firstKey}`);
      if (el) { el.focus(); el.scrollIntoView({ behavior: 'smooth', block: 'center' }); }
    }
    return Object.keys(errors).length === 0;
  };

  // ── Save step ────────────────────────────────────────────────────────────
  const handleSave = async (quiet = false, isSkipping = false) => {
    if (!user?.startup_id) { setError('Please complete startup registration first.'); return false; }
    setIsSaving(true);
    setError('');
    try {
      const fields = stepFields[step] || {};
      let finalFields = { ...fields };
      if (isSkipping) {
        finalFields._skipped = true;
      }
      const score = calcScore(finalFields);
      await api.post('/api/evaluations', { step, score, data: JSON.stringify(finalFields) });
      await api.put(`/api/startups/${user.startup_id}`, { evaluation_step: step });
      setSavedEvals(prev => ({ ...prev, [step]: { step, score, data: JSON.stringify(finalFields) } }));
      isDirty.current = false;
      if (!quiet) {
        setSuccessMsg(isSkipping ? 'Skipped ⏭' : 'Saved ✓');
        setTimeout(() => setSuccessMsg(''), 2500);
      }
      return true;
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to save. Please try again.');
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  const handleSkip = async () => {
    const ok = await handleSave(false, true);
    if (!ok) return;
    setAiSuggestion(null);
    setShowHelp(false);
    setValidationErrors({});
    if (step === 14) { setStep(15); fetchResult(); }
    else setStep(p => Math.min(p + 1, TOTAL));
  };

  const goNext = async () => {
    if (!validate()) return;
    const ok = await handleSave(false);
    if (!ok) return;
    setAiSuggestion(null);
    setShowHelp(false);
    setValidationErrors({});
    if (step === 14) { setStep(15); fetchResult(); }
    else setStep(p => Math.min(p + 1, TOTAL));
  };

  const goPrev = () => {
    setAiSuggestion(null);
    setShowHelp(false);
    setValidationErrors({});
    setStep(p => Math.max(p - 1, 1));
  };

  const goToStep = (s) => {
    const maxReached = Math.max(step, ...Object.keys(savedEvals).map(Number), 1);
    if (s <= maxReached) {
      setAiSuggestion(null);
    setShowHelp(false);
      setValidationErrors({});
      setStep(s);
    }
  };

  // ── File upload (reuses existing /api/uploads endpoint) ─────────────────
  const handleFileUpload = async (docKey, file) => {
    if (!file) return;

      // Frontend validation
      if (file.size > 15 * 1024 * 1024) {
          setError('File too large. Maximum size is 15 MB.');
          return;
      }
      const allowedExtensions = ['.pdf', '.docx', '.pptx', '.xlsx', '.png', '.jpg', '.jpeg', '.mp4'];
      const ext = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
      if (!allowedExtensions.includes(ext)) {
          setError(`File type '${ext}' not allowed.`);
          return;
      }
    setUploadingKey(docKey);
    setError('');
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('doc_type', docKey);
      const res = await api.post('/api/uploads', fd);
      setUploads(prev => ({ ...prev, [docKey]: res.data }));
      setSuccessMsg('File uploaded ✓');
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) {
      setError(err.response?.data?.detail || 'Upload failed. Allowed: PDF/DOCX/PPTX/XLSX/PNG/JPG/MP4. Max 15 MB.');
    } finally {
      setUploadingKey(null);
    }
  };

  const handleRemoveUpload = async (docKey) => {
  
  const handleDownload = async (docId, filename, action) => {
    try {
      const res = await api.get(`/api/uploads/${docId}/${action}`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data], { type: res.headers['content-type'] }));
      if (action === 'view') {
        window.open(url, '_blank');
      } else {
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', filename);
        document.body.appendChild(link);
        link.click();
        link.remove();
      }
      setTimeout(() => window.URL.revokeObjectURL(url), 5000);
    } catch (err) {
      setError(`Failed to ${action} document.`);
    }
  };
  const doc = uploads[docKey];
    if (!doc) return;
    try {
      await api.delete(`/api/uploads/${doc.id}`);
      setUploads(prev => { const n = { ...prev }; delete n[docKey]; return n; });
    } catch { setError('Could not remove file.'); }
  };

  // ── AI Actions (three meaningfully different behaviors) ─────────────────
  const targetFieldName  = AI_PRIMARY_FIELD[step] || STEP_CONFIG[step]?.fields[0]?.name;
  const targetFieldValue = currentFields[targetFieldName] || '';
  const targetFieldLabel = STEP_CONFIG[step]?.fields.find(f => f.name === targetFieldName)
    ?.label?.replace(' *', '') || (targetFieldName?.replace(/_/g, ' ') || 'primary field');

  const handleAiGenerate = async () => {
    setAiLoading(true);
    setAiSuggestion(null);
    setShowHelp(false);
    try {
      const res = await api.post('/api/ai/generate', {
        action: 'generate',
        context: targetFieldLabel
      });
      setAiSuggestion({ text: res.data.text, fieldName: targetFieldName, action: 'generate' });
    } catch (e) {
      setAiSuggestion({ text: '[AI Error] Failed to connect to AI service.', fieldName: targetFieldName, action: 'error' });
    }
    setAiLoading(false);
  };

  const handleAiImprove = async () => {
    if (!targetFieldValue.trim()) {
      setAiSuggestion({ text: 'This field is empty. Use "Generate with AI" to create initial content, then Improve to refine it.', fieldName: targetFieldName, action: 'error' });
      return;
    }
    setAiLoading(true);
    setAiSuggestion(null);
    setShowHelp(false);
    try {
      const res = await api.post('/api/ai/generate', {
        action: 'improve',
        text: targetFieldValue
      });
      setAiSuggestion({ text: res.data.text || 'Enter at least a few words first.', fieldName: targetFieldName, action: res.data.text ? 'improve' : 'error' });
    } catch (e) {
      setAiSuggestion({ text: '[AI Error] Failed to connect to AI service.', fieldName: targetFieldName, action: 'error' });
    }
    setAiLoading(false);
  };

  const handleAiRewrite = async () => {
    if (!targetFieldValue.trim()) {
      setAiSuggestion({ text: 'Enter some content first, then use Rewrite to get an alternative version.', fieldName: targetFieldName, action: 'error' });
      return;
    }
    setAiLoading(true);
    setAiSuggestion(null);
    setShowHelp(false);
    try {
      const res = await api.post('/api/ai/generate', {
        action: 'rewrite',
        text: targetFieldValue
      });
      setAiSuggestion({ text: res.data.text || 'Enter at least one full sentence first.', fieldName: targetFieldName, action: res.data.text ? 'rewrite' : 'error' });
    } catch (e) {
      setAiSuggestion({ text: '[AI Error] Failed to connect to AI service.', fieldName: targetFieldName, action: 'error' });
    }
    setAiLoading(false);
  };

  const handleStartWithAi = async (index, recommendation) => {
    setRecAiLoading(index);
    try {
      const res = await api.post('/api/ai/generate', {
        action: 'action_plan',
        context: recommendation
      });
      setRecAiResult(prev => ({ ...prev, [index]: res.data.text }));
    } catch (e) {
      setRecAiResult(prev => ({ ...prev, [index]: '[AI Error] Failed to connect to AI service.' }));
    }
    setRecAiLoading(null);
  };

  const applyAiSuggestion = () => {
    if (aiSuggestion && aiSuggestion.action !== 'error') {
      setField(aiSuggestion.fieldName, aiSuggestion.text);
      setAiSuggestion(null);
    setShowHelp(false);
    }
  };

  // ── Derived ─────────────────────────────────────────────────────────────
  const progress      = Math.round(((step - 1) / (TOTAL - 1)) * 100);
  const cfg           = step < 15 ? STEP_CONFIG[step] : null;
  const savedCount = Object.values(savedEvals).filter(e => {
      if (e.step > 14) return false;
      try { return !JSON.parse(e.data)._skipped; } catch { return true; }
    }).length;
  // P6: Live score from in-memory fields for current step
  const currentLiveScore = (step < 15) ? calcScore(stepFields[step] || {}) : 0;
  const scoreEstimate = (() => {
    let total = 0, count = 0;
    for (let s = 1; s <= 14; s++) {
      if (s === step && step < 15) {
        total += currentLiveScore; count++;
      } else if (savedEvals[s]) {
        try {
          if (!JSON.parse(savedEvals[s].data)._skipped) { total += savedEvals[s].score || 0; count++; }
        } catch { total += savedEvals[s].score || 0; count++; }
      }
    }
    return count > 0 ? total / count : 0;
  })();
  const stepUploads   = STEP_UPLOADS[step] || [];
  const maxReached    = Math.max(step, ...Object.keys(savedEvals).map(Number), 1);

  // ── Render ──────────────────────────────────────────────────────────────
  return (
    <div className="max-w-6xl mx-auto py-8 px-4 sm:px-6 flex gap-6 flex-col lg:flex-row">

      {/* ── Main Panel ── */}
      <div className="flex-1 min-w-0">

        {/* Header */}
        <div className="mb-5 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <Link to="/dashboard" className="w-10 h-10 bg-white border border-slate-200 rounded-full flex items-center justify-center text-slate-500 hover:text-slate-900 shadow-sm shrink-0">
              <ArrowLeft className="w-5 h-5"/>
            </Link>
            <div>
              <h1 className="text-xl font-bold text-slate-900">AI Startup Evaluation</h1>
              <p className="text-sm text-slate-500 mt-0.5">
                <span className="font-semibold text-brand-600">Step {step} of {TOTAL}</span>
                {cfg && <span> · {cfg.title}</span>}
              </p>
            </div>
          </div>
          <div className="text-sm font-medium">
            {isSaving
              ? <span className="text-slate-400 flex items-center gap-1"><Loader2 className="w-4 h-4 animate-spin"/>Saving…</span>
              : successMsg
              ? <span className="text-emerald-600">{successMsg}</span>
              : step < 15
              ? <button onClick={() => handleSave(false)} className="text-slate-500 hover:text-brand-600 flex items-center gap-1.5 transition-colors">
                  <Save className="w-4 h-4"/>Save &amp; Exit
                </button>
              : null}
          </div>
        </div>

        {/* Progress bar */}
        <div className="h-2 bg-slate-200 rounded-full mb-5 overflow-hidden">
          <div className="h-full bg-brand-500 transition-all duration-500 rounded-full" style={{ width: `${progress}%` }}/>
        </div>

        {/* Step pills — clickable for visited steps */}
        <div className="flex gap-1 mb-5 flex-wrap">
          {Array.from({ length: TOTAL }, (_, i) => i + 1).map(s => {
            let isSaved = false;
            let isSkipped = false;
            if (savedEvals[s]) {
              isSaved = true;
              try { isSkipped = JSON.parse(savedEvals[s].data)._skipped; } catch {}
            }
            return (
              <div key={s}
                onClick={() => goToStep(s)}
                title={s <= 14 ? (STEP_CONFIG[s]?.title || `Step ${s}`) : 'Final Result'}
                className={`w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center shrink-0 transition-colors
                  ${isSaved && !isSkipped ? 'bg-emerald-500 text-white' : isSaved && isSkipped ? 'bg-amber-400 text-white' : s === step ? 'bg-brand-600 text-white' : 'bg-slate-200 text-slate-500'}
                  ${s <= maxReached ? 'cursor-pointer hover:opacity-80' : 'cursor-default'}`}>
                {isSaved && !isSkipped ? '✓' : isSaved && isSkipped ? '⏭' : s}
              </div>
            );
          })}
        </div>

        {/* Error banner */}
        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-700 text-sm p-3 rounded-lg flex gap-2 items-start">
            <span className="shrink-0">⚠</span><span>{error}</span>
          </div>
        )}

        <div className="saas-card min-h-[450px] flex flex-col overflow-hidden">
          <div className="p-6 sm:p-8 flex-1 flex flex-col">

            {/* ── STEPS 1–14 ── */}
            {step < 15 && cfg && (
              <div className="flex-1 flex flex-col">
                                  <div className="flex items-center gap-2 mb-1">
                    <h2 className="text-xl font-bold text-slate-900">{cfg.title}</h2>
                    {cfg.helpText && (
                      <button onClick={() => setShowHelp(!showHelp)} className="text-slate-400 hover:text-brand-500 transition-colors focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-1 rounded-full">
                        <Info className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  {showHelp && cfg.helpText && (
                    <div className="mb-4 p-3 bg-brand-50 border border-brand-100 rounded-lg text-sm text-brand-800 flex items-start gap-2 animate-in fade-in zoom-in-95 duration-200">
                      <Info className="w-4 h-4 mt-0.5 shrink-0 text-brand-500" />
                      <p><strong>Why this matters:</strong> {cfg.helpText}</p>
                    </div>
                  )}
                <p className="text-sm text-slate-500 mb-5">
                  {savedEvals[step]
                    ? `✓ Previously saved · Score: ${savedEvals[step].score}/100`
                    : 'Fill in as much detail as possible for a higher score. Fields marked * are required.'}
                </p>

                <div className="space-y-5 flex-1">
                  {cfg.fields.map(field => (
                    <div key={field.name}>
                      <label htmlFor={`field-${field.name}`} className="form-label">{field.label}</label>

                      {field.type === 'textarea' && (
                        <textarea
                          id={`field-${field.name}`}
                          rows={3}
                          className={`saas-input w-full resize-none ${validationErrors[field.name] ? 'border-red-400 focus:ring-red-300' : ''}`}
                          placeholder={field.placeholder}
                          value={currentFields[field.name] || ''}
                          onChange={e => setField(field.name, e.target.value)}
                        />
                      )}
                      {field.type === 'text' && (
                        <input
                          id={`field-${field.name}`}
                          type="text"
                          className={`saas-input ${validationErrors[field.name] ? 'border-red-400 focus:ring-red-300' : ''}`}
                          placeholder={field.placeholder}
                          value={currentFields[field.name] || ''}
                          onChange={e => setField(field.name, e.target.value)}
                        />
                      )}
                      {field.type === 'select' && (
                        <select
                          id={`field-${field.name}`}
                          className={`saas-input ${validationErrors[field.name] ? 'border-red-400 focus:ring-red-300' : ''}`}
                          value={currentFields[field.name] || ''}
                          onChange={e => setField(field.name, e.target.value)}>
                          <option value="">Select…</option>
                          {field.options.map(o => <option key={o}>{o}</option>)}
                        </select>
                      )}
                      {validationErrors[field.name] && (
                        <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                          <span>⚠</span> {validationErrors[field.name]}
                        </p>
                      )}
                    </div>
                  ))}

                  {/* Upload panel — only for steps 2, 4, 8, 13 */}
                  {stepUploads.length > 0 && (
                    <div className="pt-5 border-t border-slate-100">
                      <p className="text-sm font-semibold text-slate-700 mb-3">Supporting Documents</p>
                      <p className="text-xs text-slate-400 mb-3">Allowed: PDF, DOCX, PPTX, XLSX, PNG, JPG, MP4. Max 15 MB each.</p>
                      <div className="space-y-3">
                        {stepUploads.map(doc => {
                          const uploaded  = uploads[doc.key];
                          const isUploading = uploadingKey === doc.key;
                          return (
                            <div key={doc.key} className={`border rounded-xl p-4 transition-colors ${uploaded ? 'border-emerald-300 bg-emerald-50/40' : 'border-slate-200'}`}>
                              <div className="flex items-center justify-between gap-3 flex-wrap">
                                <div className="flex items-center gap-3">
                                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${uploaded ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}>
                                    <FileText className="w-4 h-4"/>
                                  </div>
                                  <div>
                                    <p className="font-semibold text-slate-800 text-sm">{doc.label}</p>
                                    {uploaded
                                      ? <div className="flex flex-col gap-0.5">
                                                                <p className="text-xs font-medium text-emerald-700 truncate max-w-xs" title={uploaded.original_filename}>{uploaded.original_filename}</p>
                                                                <div className="flex items-center gap-2 text-[10px] text-emerald-600/70">
                                                                    <span className="uppercase">{uploaded.original_filename.split('.').pop()}</span>
                                                                    {uploaded.uploaded_at && (
                                                                        <>
                                                                            <span>•</span>
                                                                            <span className="flex items-center gap-0.5"><Calendar className="w-3 h-3"/> {new Date(uploaded.uploaded_at).toLocaleDateString()}</span>
                                                                        </>
                                                                    )}
                                                                </div>
                                                            </div>
                                      : <p className="text-xs text-slate-400">{doc.hint}</p>}
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  {isUploading && <Loader2 className="w-4 h-4 animate-spin text-brand-500"/>}
                                  {uploaded && !isUploading && (
                                    <button type="button" onClick={() => handleRemoveUpload(doc.key)}
                                      className="text-slate-400 hover:text-red-500 transition-colors" title="Remove">
                                      <X className="w-4 h-4"/>
                                    </button>
                                  )}
                                  <button type="button" disabled={isUploading}
                                    onClick={() => fileInputRefs.current[doc.key]?.click()}
                                    className={`saas-button text-xs py-1.5 px-3 ${uploaded ? 'saas-button-secondary' : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'}`}>
                                    <Upload className="w-3.5 h-3.5"/>{uploaded ? 'Replace' : 'Upload'}
                                  </button>
                                  <input
                                    ref={el => fileInputRefs.current[doc.key] = el}
                                    type="file" className="hidden" accept={ALLOWED_TYPES}
                                    onChange={e => { if (e.target.files[0]) handleFileUpload(doc.key, e.target.files[0]); e.target.value = ''; }}
                                  />
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ── STEP 15 — FINAL RESULT ── */}
            {step === 15 && (
              <div className="flex-1">
                {loadingResult ? (
                  <div className="flex flex-col items-center justify-center h-64 gap-4">
                    <Loader2 className="w-10 h-10 animate-spin text-brand-500"/>
                    <p className="text-slate-500">Calculating your readiness score…</p>
                  </div>
                ) : result ? (
                  <div>
                    {/* Overall score */}
                    <div className="text-center mb-8 p-6 bg-gradient-to-br from-brand-900 to-brand-700 rounded-2xl text-white relative overflow-hidden">
                      <Shield className="w-40 h-40 text-white/5 absolute -bottom-6 -right-6"/>
                      <p className="text-brand-200 text-sm font-medium mb-2 uppercase tracking-widest">Overall Funding Readiness</p>
                      <p className="text-7xl font-extrabold mb-2">{result.overall_score}%</p>
                      <span className="px-4 py-1.5 bg-white/20 backdrop-blur rounded-full text-sm font-semibold">
                        {result.readiness_label}
                      </span>
                      <p className="text-brand-200 text-xs mt-3">
                        {result.total_sections_completed} of 14 scored sections evaluated · Rule-based assessment
                      </p>
                    </div>

                    {/* Industry Benchmark */}
                    <div className="mb-8 p-4 border border-brand-100 bg-brand-50 rounded-xl flex items-center justify-between gap-4 flex-wrap">
                      <div>
                        <h4 className="font-bold text-brand-900 flex items-center gap-2">
                          <Activity className="w-4 h-4 text-brand-500" />
                          Industry Benchmarking (Sample Data)
                        </h4>
                        <p className="text-xs text-brand-700 mt-0.5">
                          Comparing your score against typical seed-stage startups in <strong>{startup?.industry || 'your sector'}</strong>.
                        </p>
                      </div>
                      <div className="flex items-center gap-6 text-sm">
                        <div className="text-center">
                          <p className="text-brand-600 font-semibold mb-0.5">Your Score</p>
                          <p className="text-xl font-bold text-brand-900">{result.overall_score}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-brand-600 font-semibold mb-0.5">Benchmark</p>
                          <p className="text-xl font-bold text-slate-500">
                            {startup?.industry && ['FinTech', 'SaaS', 'AI'].includes(startup.industry) ? 78 : 74}
                          </p>
                        </div>
                        <div className="text-center">
                          <p className="text-brand-600 font-semibold mb-0.5">Difference</p>
                          <p className={`text-xl font-bold ${result.overall_score - (startup?.industry && ['FinTech', 'SaaS', 'AI'].includes(startup.industry) ? 78 : 74) >= 0 ? 'text-emerald-600' : 'text-amber-600'}`}>
                            {result.overall_score - (startup?.industry && ['FinTech', 'SaaS', 'AI'].includes(startup.industry) ? 78 : 74) > 0 ? '+' : ''}
                            {result.overall_score - (startup?.industry && ['FinTech', 'SaaS', 'AI'].includes(startup.industry) ? 78 : 74)}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Category scores */}
                    <h3 className="font-bold text-slate-900 mb-3 text-lg">Category Scores</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-8">
                      {Object.entries(result.category_scores).map(([cat, score]) => (
                        <div key={cat} className="border border-slate-200 rounded-xl p-4 bg-white">
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-sm font-semibold text-slate-700 truncate pr-2">{cat}</span>
                            <span className={`text-sm font-bold shrink-0 ${score >= 70 ? 'text-emerald-600' : score >= 50 ? 'text-amber-600' : 'text-red-500'}`}>{score}/100</span>
                          </div>
                          <div className="w-full bg-slate-100 rounded-full h-1.5">
                            <div className={`h-1.5 rounded-full transition-all ${score >= 70 ? 'bg-emerald-500' : score >= 50 ? 'bg-amber-400' : 'bg-red-400'}`}
                              style={{ width: `${score}%` }}/>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* SWOT */}
                    <h3 className="font-bold text-slate-900 mb-3 text-lg">SWOT Analysis</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
                      {[
                        { title: 'Strengths',     items: result.strengths,     color: 'emerald', icon: CheckCircle2 },
                        { title: 'Weaknesses',    items: result.weaknesses,    color: 'red',     icon: AlertTriangle },
                        { title: 'Opportunities', items: result.opportunities, color: 'blue',    icon: TrendingUp },
                        { title: 'Threats',       items: result.threats,       color: 'amber',   icon: Shield },
                      ].map(({ title, items, color, icon: Icon }) => (
                        <div key={title} className={`border border-${color}-200 rounded-xl p-4 bg-${color}-50/30`}>
                          <h4 className={`font-bold text-${color}-800 flex items-center gap-2 mb-3`}>
                            <Icon className={`w-4 h-4 text-${color}-500`}/>{title}
                          </h4>
                          <ul className="space-y-1.5">
                            {items.map((item, i) => (
                              <li key={i} className={`text-sm text-${color}-700 flex gap-2 items-start`}>
                                <span className="mt-1 shrink-0">·</span><span>{item}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>

                    {/* Recommendations */}
                    <h3 className="font-bold text-slate-900 mb-3 text-lg">Top Recommendations</h3>
                    <div className="space-y-3 mb-6">
                      {result.recommendations.map((rec, i) => (
                        <div key={i} className="border border-slate-200 rounded-xl p-4 bg-white flex flex-col sm:flex-row gap-3">
                          <div className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold
                            ${rec.priority === 'High' ? 'bg-red-100 text-red-600' : rec.priority === 'Medium' ? 'bg-amber-100 text-amber-600' : 'bg-slate-100 text-slate-500'}`}>
                            {i + 1}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-start justify-between gap-2 flex-wrap">
                              <p className="font-semibold text-slate-900 text-sm">{rec.recommendation}</p>
                              <span className={`text-xs px-2 py-0.5 rounded-full font-semibold shrink-0
                                ${rec.priority === 'High' ? 'bg-red-100 text-red-700' : rec.priority === 'Medium' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-500'}`}>
                                {rec.priority}
                              </span>
                            </div>
                            <div className="flex gap-4 mt-1.5 text-xs text-slate-500 flex-wrap">
                              <span>📈 {rec.expected_improvement}</span>
                              <span>⚡ Effort: {rec.effort}</span>
                              <span>👤 {rec.owner}</span>
                            </div>
                              <div className="mt-3">
                                {!recAiResult[i] ? (
                                  <button 
                                    onClick={() => handleStartWithAi(i, rec.recommendation)}
                                    disabled={recAiLoading === i}
                                    className="text-xs bg-brand-50 hover:bg-brand-100 text-brand-700 font-semibold py-1.5 px-3 rounded-lg flex items-center gap-1.5 transition-colors disabled:opacity-50">
                                    {recAiLoading === i ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                                    Start with AI
                                  </button>
                                ) : (
                                  <div className="bg-brand-50/50 border border-brand-100 rounded-lg p-3 mt-2 text-xs text-slate-700 whitespace-pre-wrap">
                                    <p className="font-bold text-brand-900 mb-1 flex items-center gap-1.5">
                                      <Sparkles className="w-3 h-3" /> AI Action Plan
                                    </p>
                                    {recAiResult[i]}
                                  </div>
                                )}
                              </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="flex gap-3 justify-center pt-4 border-t border-slate-100 flex-wrap">
                      <Link to="/dashboard" className="saas-button saas-button-primary">View Dashboard</Link>
                      <button className="saas-button saas-button-secondary flex items-center gap-2"
                        onClick={downloadReport}
                        disabled={isPdfDownloading}>
                        {isPdfDownloading
                          ? <><Loader2 className="w-4 h-4 animate-spin"/>Generating PDF…</>
                          : <><FileText className="w-4 h-4"/>Download Report (PDF)</>}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <BarChart3 className="w-12 h-12 text-slate-300 mx-auto mb-4"/>
                    <p className="text-slate-500">Complete Steps 1–14 to generate your evaluation result.</p>
                    <button onClick={() => setStep(1)} className="saas-button saas-button-primary mt-4">
                      Start from Step 1
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* ── Navigation ── */}
            {step < 15 && (
              <div className="pt-6 border-t border-slate-100 flex items-center justify-between mt-8">
                {step > 1
                  ? <button onClick={goPrev} className="saas-button saas-button-secondary border-transparent bg-transparent hover:bg-slate-50 text-slate-600">
                      <ArrowLeft className="w-4 h-4"/>Back
                    </button>
                  : <div/>}
                <div className="flex items-center gap-2">
                  {cfg && !cfg.fields.some(f => f.required) && (
                    <button
                      onClick={handleSkip}
                      disabled={isSaving}
                      className="saas-button bg-slate-100 hover:bg-slate-200 text-slate-600 text-sm py-2 px-4 rounded-lg transition-colors disabled:opacity-50">
                      Skip for now
                    </button>
                  )}
                  <button onClick={goNext} disabled={isSaving}
                    className={`saas-button saas-button-primary ${isSaving ? 'opacity-70 cursor-not-allowed' : ''}`}>
                  {isSaving
                    ? <><Loader2 className="w-4 h-4 animate-spin"/>Saving…</>
                    : step === 14
                    ? 'Generate Result →'
                    : <>Next Step<ArrowRight className="w-4 h-4"/></>}
                </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── AI Copilot Sidebar ── */}
      {step < 15 && (
        <div className="w-full lg:w-72 shrink-0">
          <div className="saas-card p-5 bg-gradient-to-br from-brand-900 to-brand-700 text-white border-none shadow-xl shadow-brand-900/10 sticky top-24">

            {/* Header */}
            <div className="flex items-center gap-3 mb-5 pb-4 border-b border-brand-800">
              <div className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center shrink-0">
                <Bot className="w-5 h-5 text-brand-100"/>
              </div>
              <div>
                <p className="font-bold text-white text-sm">StartupReady AI</p>
                <p className="text-brand-300 text-xs">Copilot · Rule-based</p>
              </div>
            </div>

            {/* Step tip */}
            <div className="bg-white/10 rounded-lg p-3 mb-4 border border-white/5">
              <p className="text-white font-semibold text-xs flex items-center gap-1.5 mb-1.5">
                <Info className="w-3.5 h-3.5 text-brand-300"/>Tip for this step
              </p>
              <p className="text-brand-100 text-xs leading-relaxed">{STEP_TIPS[step]}</p>
            </div>

            {/* AI target field indicator */}
            <p className="text-brand-400 text-xs mb-2 flex items-center gap-1 truncate">
              <Zap className="w-3 h-3 shrink-0"/>
              AI targeting: <span className="text-brand-200 font-medium truncate ml-1">{targetFieldLabel}</span>
            </p>

            {/* AI action buttons — three meaningfully different actions */}
            <div className="space-y-2 mb-3">
              <button disabled={aiLoading} onClick={handleAiGenerate}
                className="w-full bg-white/10 hover:bg-white/20 border border-white/20 text-white text-xs font-medium py-2 px-3 rounded-lg flex items-center gap-1.5 transition-colors disabled:opacity-50">
                {aiLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin"/> : <Sparkles className="w-3.5 h-3.5"/>}
                Generate with AI
              </button>
              <button disabled={aiLoading} onClick={handleAiImprove}
                className="w-full bg-brand-500/40 hover:bg-brand-500/70 border border-brand-400 text-white text-xs font-medium py-2 px-3 rounded-lg flex items-center gap-1.5 transition-colors disabled:opacity-50">
                {aiLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin"/> : <Zap className="w-3.5 h-3.5"/>}
                Improve with AI
              </button>
              <button disabled={aiLoading} onClick={handleAiRewrite}
                className="w-full bg-white/10 hover:bg-white/20 border border-white/20 text-white text-xs font-medium py-2 px-3 rounded-lg flex items-center gap-1.5 transition-colors disabled:opacity-50">
                {aiLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin"/> : <RotateCcw className="w-3.5 h-3.5"/>}
                Rewrite
              </button>
            </div>

            {/* AI Suggestion Panel */}
            {aiSuggestion && (
              <div className={`rounded-lg p-3 border text-xs leading-relaxed mb-3
                ${aiSuggestion.action === 'error'
                  ? 'bg-amber-900/30 border-amber-600/30 text-amber-200'
                  : 'bg-white/10 border-white/20 text-white'}`}>
                <p className="font-semibold mb-2 text-brand-200">
                  {aiSuggestion.action === 'generate' && '✨ Generated content:'}
                  {aiSuggestion.action === 'improve'  && '⚡ Improved version:'}
                  {aiSuggestion.action === 'rewrite'  && '🔄 Rewritten version:'}
                  {aiSuggestion.action === 'error'    && '⚠ Note:'}
                </p>
                <p className="whitespace-pre-wrap text-xs break-words">{aiSuggestion.text}</p>
                {aiSuggestion.action !== 'error' && (
                  <div className="flex gap-2 mt-3">
                    <button onClick={applyAiSuggestion}
                      className="flex-1 bg-emerald-500/80 hover:bg-emerald-500 text-white text-xs font-semibold py-1.5 px-2 rounded-lg transition-colors">
                      Apply
                    </button>
                    <button onClick={() => setAiSuggestion(null)}
                      className="flex-1 bg-white/10 hover:bg-white/20 text-white text-xs py-1.5 px-2 rounded-lg transition-colors">
                      Dismiss
                    </button>
                  </div>
                )}
                {aiSuggestion.action === 'error' && (
                  <button onClick={() => setAiSuggestion(null)}
                    className="mt-2 text-amber-300 text-xs hover:underline block">Dismiss</button>
                )}
              </div>
            )}

            {/* Score + sections saved */}
            <div className="mt-4 pt-4 border-t border-brand-800">
              <div className="flex justify-between items-center text-xs mb-1.5">
                <span className="text-brand-300">Avg section score</span>
                <span className="text-white font-bold">{Math.round(scoreEstimate) || 0}/100</span>
              </div>
              <div className="w-full bg-brand-950/50 rounded-full h-1.5">
                <div className="bg-brand-300 h-1.5 rounded-full transition-all" style={{ width: `${Math.min(scoreEstimate, 100)}%` }}/>
              </div>
              <p className="text-brand-400 text-xs mt-2">{savedCount} of 14 scored sections saved</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}








