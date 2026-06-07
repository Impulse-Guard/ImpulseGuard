import { useState } from 'react';
import { Button, Text, Heading, Flex, Card, Box, TextField, Badge } from '@radix-ui/themes';
import { sendMessage } from '../api/claude';

type Step = 'welcome' | 'questionnaire' | 'ai-insight' | 'accountability' | 'tutorial' | 'done';

interface UserProfile {
  spendingChallenge: string;
  monthlySavingsGoal: string;
  financialGoal: string;
}

const SPENDING_CHALLENGES = [
  { value: 'impulse', label: 'Impulse buys', emoji: '⚡' },
  { value: 'categories', label: 'Overspending on specific categories', emoji: '🛍️' },
  { value: 'subscriptions', label: 'Subscription creep', emoji: '📺' },
  { value: 'fomo', label: 'FOMO purchases', emoji: '😅' },
];

const FINANCIAL_GOALS = [
  { value: 'emergency', label: 'Build emergency fund', emoji: '🛡️' },
  { value: 'vacation', label: 'Save for vacation', emoji: '✈️' },
  { value: 'debt', label: 'Pay off debt', emoji: '📉' },
  { value: 'retirement', label: 'Retirement savings', emoji: '🏖️' },
];

const TUTORIAL_STEPS = [
  {
    emoji: '🛒',
    title: 'Shop normally',
    description: 'Browse your favourite online stores as you always would. Impulse Guard works silently in the background.',
  },
  {
    emoji: '🤖',
    title: 'AI detects impulse purchases',
    description: 'When you go to check out, our AI analyses the items and flags anything that looks like an impulse buy.',
  },
  {
    emoji: '⏱️',
    title: '24-hour cooling period',
    description: 'Flagged items are blocked for 24 hours. If you still want it tomorrow, you can buy it — but most impulses fade.',
  },
  {
    emoji: '💰',
    title: 'Watch your savings grow',
    description: 'Every blocked purchase saves real money. Track your progress in the extension popup.',
  },
];

export default function Onboarding() {
  const [step, setStep] = useState<Step>('welcome');
  const [profile, setProfile] = useState<UserProfile>({
    spendingChallenge: '',
    monthlySavingsGoal: '',
    financialGoal: '',
  });
  const [buddyName, setBuddyName] = useState('');
  const [buddyEmail, setBuddyEmail] = useState('');
  const [aiInsight, setAiInsight] = useState('');
  const [loadingInsight, setLoadingInsight] = useState(false);
  const [tutorialStep, setTutorialStep] = useState(0);

  async function generateInsight() {
    setLoadingInsight(true);
    setStep('ai-insight');
    try {
      const prompt = `You are a friendly financial coach. Based on this person's profile, give them a short, encouraging, personalized insight (2-3 sentences max) about how Impulse Guard will help them specifically. Be warm and specific to their answers.

Profile:
- Biggest spending challenge: ${profile.spendingChallenge}
- Monthly savings goal: $${profile.monthlySavingsGoal}
- Financial goal: ${profile.financialGoal}

Keep it concise, motivational, and personal. No lists or headers — just a short paragraph.`;

      const response = await sendMessage([{ role: 'user', content: prompt }]);
      setAiInsight(response);
    } catch {
      setAiInsight(
        "Impulse Guard is ready to help you build better spending habits and reach your financial goals — one blocked impulse at a time."
      );
    } finally {
      setLoadingInsight(false);
    }
  }

  async function saveAndFinish() {
    await chrome.storage.local.set({
      onboardingComplete: true,
      userProfile: profile,
      accountabilityBuddy: buddyName ? { name: buddyName, email: buddyEmail } : null,
    });
    setStep('done');
  }

  const canProceedQuestionnaire =
    profile.spendingChallenge && profile.monthlySavingsGoal && profile.financialGoal;

  return (
    <Flex
      direction="column"
      align="center"
      justify="center"
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #0a0a0a 0%, #0d1a0d 50%, #0a0a0a 100%)',
        padding: '40px 20px',
      }}
    >
      {/* ── WELCOME ── */}
      {step === 'welcome' && (
        <Flex direction="column" align="center" gap="6" style={{ maxWidth: 560, textAlign: 'center' }}>
          <Text style={{ fontSize: 72 }}>💰</Text>
          <Flex direction="column" gap="2">
            <Heading size="9" style={{ color: '#fff', lineHeight: 1.1 }}>
              Welcome to<br />
              <span style={{ color: 'var(--green-9)' }}>Impulse Guard</span>
            </Heading>
            <Text size="4" color="gray" style={{ marginTop: 8 }}>
              Your AI-powered co-pilot for smarter spending. Let's get you set up in 2 minutes.
            </Text>
          </Flex>
          <Flex gap="3" wrap="wrap" justify="center">
            {['🤖 AI-powered analysis', '⏱️ 24h cool-down', '📊 Savings tracking'].map((f) => (
              <Badge key={f} size="2" variant="soft" color="green">{f}</Badge>
            ))}
          </Flex>
          <Button size="4" onClick={() => setStep('questionnaire')} style={{ marginTop: 8, width: 240 }}>
            Get Started →
          </Button>
        </Flex>
      )}

      {/* ── QUESTIONNAIRE ── */}
      {step === 'questionnaire' && (
        <Flex direction="column" gap="6" style={{ maxWidth: 600, width: '100%' }}>
          <Flex direction="column" gap="1">
            <Text size="2" color="green" weight="medium">Step 1 of 3</Text>
            <Heading size="7" style={{ color: '#fff' }}>Tell us about yourself</Heading>
            <Text size="3" color="gray">We'll personalise your experience using AI.</Text>
          </Flex>

          {/* Q1 */}
          <Flex direction="column" gap="3">
            <Text size="3" weight="medium" style={{ color: '#fff' }}>
              What's your biggest spending challenge?
            </Text>
            <Flex gap="3" wrap="wrap">
              {SPENDING_CHALLENGES.map(({ value, label, emoji }) => (
                <Card
                  key={value}
                  onClick={() => setProfile((p) => ({ ...p, spendingChallenge: label }))}
                  style={{
                    cursor: 'pointer',
                    border: profile.spendingChallenge === label
                      ? '2px solid var(--green-9)'
                      : '2px solid transparent',
                    flex: '1 1 140px',
                    textAlign: 'center',
                    padding: '12px 8px',
                  }}
                >
                  <Text style={{ fontSize: 24 }}>{emoji}</Text>
                  <Text size="2" style={{ display: 'block', marginTop: 4 }}>{label}</Text>
                </Card>
              ))}
            </Flex>
          </Flex>

          {/* Q2 */}
          <Flex direction="column" gap="2">
            <Text size="3" weight="medium" style={{ color: '#fff' }}>
              How much do you want to save per month? ($)
            </Text>
            <TextField.Root
              size="3"
              type="number"
              placeholder="e.g. 200"
              value={profile.monthlySavingsGoal}
              onChange={(e) => setProfile((p) => ({ ...p, monthlySavingsGoal: e.target.value }))}
              style={{ maxWidth: 220 }}
            />
          </Flex>

          {/* Q3 */}
          <Flex direction="column" gap="3">
            <Text size="3" weight="medium" style={{ color: '#fff' }}>
              What's your main financial goal?
            </Text>
            <Flex gap="3" wrap="wrap">
              {FINANCIAL_GOALS.map(({ value, label, emoji }) => (
                <Card
                  key={value}
                  onClick={() => setProfile((p) => ({ ...p, financialGoal: label }))}
                  style={{
                    cursor: 'pointer',
                    border: profile.financialGoal === label
                      ? '2px solid var(--green-9)'
                      : '2px solid transparent',
                    flex: '1 1 140px',
                    textAlign: 'center',
                    padding: '12px 8px',
                  }}
                >
                  <Text style={{ fontSize: 24 }}>{emoji}</Text>
                  <Text size="2" style={{ display: 'block', marginTop: 4 }}>{label}</Text>
                </Card>
              ))}
            </Flex>
          </Flex>

          <Button
            size="3"
            disabled={!canProceedQuestionnaire}
            onClick={generateInsight}
            style={{ alignSelf: 'flex-start' }}
          >
            Get My Personalised Insight →
          </Button>
        </Flex>
      )}

      {/* ── AI INSIGHT ── */}
      {step === 'ai-insight' && (
        <Flex direction="column" gap="6" align="center" style={{ maxWidth: 560, textAlign: 'center' }}>
          <Text size="2" color="green" weight="medium">Step 1 of 3 — Complete</Text>
          <Text style={{ fontSize: 48 }}>🤖</Text>
          <Heading size="7" style={{ color: '#fff' }}>Your personalised insight</Heading>
          <Card style={{ padding: '24px', background: 'var(--green-2)', borderColor: 'var(--green-6)' }}>
            {loadingInsight ? (
              <Flex align="center" gap="3" justify="center">
                <Text color="gray" size="3">Analysing your profile…</Text>
              </Flex>
            ) : (
              <Text size="3" style={{ lineHeight: 1.7, color: 'var(--green-11)' }}>
                {aiInsight}
              </Text>
            )}
          </Card>
          {!loadingInsight && (
            <Button size="3" onClick={() => setStep('accountability')}>
              Next: Accountability Setup →
            </Button>
          )}
        </Flex>
      )}

      {/* ── P2P ACCOUNTABILITY ── */}
      {step === 'accountability' && (
        <Flex direction="column" gap="6" style={{ maxWidth: 560, width: '100%' }}>
          <Flex direction="column" gap="1">
            <Text size="2" color="green" weight="medium">Step 2 of 3</Text>
            <Heading size="7" style={{ color: '#fff' }}>Accountability buddy</Heading>
            <Text size="3" color="gray">
              People who share their goals with a friend are 65% more likely to succeed. Add someone to keep you on track — this is optional.
            </Text>
          </Flex>

          <Card style={{ padding: '24px' }}>
            <Flex direction="column" gap="4">
              <Flex direction="column" gap="2">
                <Text size="2" weight="medium" style={{ color: '#fff' }}>Buddy's name</Text>
                <TextField.Root
                  size="3"
                  placeholder="e.g. Alex"
                  value={buddyName}
                  onChange={(e) => setBuddyName(e.target.value)}
                />
              </Flex>
              <Flex direction="column" gap="2">
                <Text size="2" weight="medium" style={{ color: '#fff' }}>Buddy's email (optional)</Text>
                <TextField.Root
                  size="3"
                  type="email"
                  placeholder="alex@example.com"
                  value={buddyEmail}
                  onChange={(e) => setBuddyEmail(e.target.value)}
                />
              </Flex>
            </Flex>
          </Card>

          <Flex gap="3">
            <Button variant="soft" size="3" onClick={() => setStep('tutorial')}>
              Skip for now
            </Button>
            <Button size="3" onClick={() => setStep('tutorial')}>
              {buddyName ? 'Save & Continue →' : 'Continue →'}
            </Button>
          </Flex>
        </Flex>
      )}

      {/* ── TUTORIAL ── */}
      {step === 'tutorial' && (
        <Flex direction="column" gap="6" style={{ maxWidth: 600, width: '100%' }}>
          <Flex direction="column" gap="1">
            <Text size="2" color="green" weight="medium">Step 3 of 3</Text>
            <Heading size="7" style={{ color: '#fff' }}>How Impulse Guard works</Heading>
          </Flex>

          <Flex direction="column" gap="3">
            {TUTORIAL_STEPS.map((s, i) => (
              <Card
                key={i}
                onClick={() => setTutorialStep(i)}
                style={{
                  padding: '20px',
                  cursor: 'pointer',
                  border: tutorialStep === i ? '2px solid var(--green-9)' : '2px solid transparent',
                  opacity: tutorialStep >= i ? 1 : 0.5,
                  transition: 'all 0.2s',
                }}
              >
                <Flex align="center" gap="4">
                  <Text style={{ fontSize: 36, flexShrink: 0 }}>{s.emoji}</Text>
                  <Flex direction="column" gap="1">
                    <Flex align="center" gap="2">
                      <Badge size="1" color="green" variant="soft">{i + 1}</Badge>
                      <Text size="3" weight="bold" style={{ color: '#fff' }}>{s.title}</Text>
                    </Flex>
                    <Text size="2" color="gray">{s.description}</Text>
                  </Flex>
                </Flex>
              </Card>
            ))}
          </Flex>

          <Button size="3" onClick={saveAndFinish} style={{ alignSelf: 'flex-start' }}>
            Finish Setup →
          </Button>
        </Flex>
      )}

      {/* ── DONE ── */}
      {step === 'done' && (
        <Flex direction="column" align="center" gap="6" style={{ maxWidth: 480, textAlign: 'center' }}>
          <Text style={{ fontSize: 72 }}>🎉</Text>
          <Flex direction="column" gap="2">
            <Heading size="8" style={{ color: '#fff' }}>You're all set!</Heading>
            <Text size="4" color="gray">
              Impulse Guard is now active. Head to{' '}
              <span style={{ color: 'var(--green-9)' }}>bestbuy.ca</span> to see it in action.
            </Text>
          </Flex>
          {buddyName && (
            <Badge size="2" color="green" variant="soft">
              🤝 Accountability buddy: {buddyName}
            </Badge>
          )}
          <Box
            style={{
              background: 'var(--green-2)',
              border: '1px solid var(--green-6)',
              borderRadius: 12,
              padding: '20px 24px',
              width: '100%',
            }}
          >
            <Text size="2" color="gray" style={{ lineHeight: 1.6 }}>
              Click the 🛡️ icon in your browser toolbar any time to view your savings stats.
              The extension works silently — you'll only see it when it blocks an impulse purchase.
            </Text>
          </Box>
          <Button size="4" onClick={() => window.close()}>
            Start Saving 💰
          </Button>
        </Flex>
      )}

      {/* Progress dots */}
      {step !== 'welcome' && step !== 'done' && (
        <Flex gap="2" style={{ marginTop: 40 }}>
          {(['questionnaire', 'ai-insight', 'accountability', 'tutorial'] as Step[]).map((s) => (
            <Box
              key={s}
              style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: step === s ? 'var(--green-9)' : 'var(--gray-6)',
                transition: 'background 0.2s',
              }}
            />
          ))}
        </Flex>
      )}
    </Flex>
  );
}
