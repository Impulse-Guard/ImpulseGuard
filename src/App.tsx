import { useState, useEffect } from 'react';
import type { StorageData } from './content/storage';
import browser from 'webextension-polyfill';
import { Button, Card, Text, Heading, Flex, Grid } from '@radix-ui/themes';
import { color, gradient, radius, shadow } from './design/tokens';

function App() {
  const [count, setCount] = useState(0);
  const [moneySaved, setMoneySaved] = useState(0);
  const [weeklySaved, setWeeklySaved] = useState(0);
  const [blockedPurchases, setBlockedPurchases] = useState(0);
  const [totalImpulses, setTotalImpulses] = useState(0);
  const [impulsesResisted, setImpulsesResisted] = useState(0);

  // Calculate success rate
  const successRate = totalImpulses > 0 
    ? Math.round((blockedPurchases / totalImpulses) * 100) 
    : 0;

  // Load data from storage on mount
  useEffect(() => {
    browser.storage.local.get([
      'count', 
      'moneySaved', 
      'weeklySaved',
      'blockedPurchases',
      'totalImpulses',
      'impulsesResisted'
    ]).then((result: Partial<StorageData>) => {
      setCount(result.count || 0);
      setMoneySaved(result.moneySaved || 0);
      setWeeklySaved(result.weeklySaved || 0);
      setBlockedPurchases(result.blockedPurchases || 0);
      setTotalImpulses(result.totalImpulses || 0);
      setImpulsesResisted(result.impulsesResisted || 0);
    });
  }, []);

  // Listen for storage changes in real-time
  useEffect(() => {
    const handleStorageChange = (changes: { [key: string]: browser.Storage.StorageChange }) => {
      if (changes.moneySaved) {
        setMoneySaved((changes.moneySaved.newValue as number) || 0);
      }
      if (changes.weeklySaved) {
        setWeeklySaved((changes.weeklySaved.newValue as number) || 0);
      }
      if (changes.count) {
        setCount((changes.count.newValue as number) || 0);
      }
      if (changes.blockedPurchases) {
        setBlockedPurchases((changes.blockedPurchases.newValue as number) || 0);
      }
      if (changes.totalImpulses) {
        setTotalImpulses((changes.totalImpulses.newValue as number) || 0);
      }
      if (changes.impulsesResisted) {
        setImpulsesResisted((changes.impulsesResisted.newValue as number) || 0);
      }
    };

    browser.storage.onChanged.addListener(handleStorageChange);

    return () => {
      browser.storage.onChanged.removeListener(handleStorageChange);
    };
  }, []);

  const handleClick = () => {
    const newCount = count + 1;
    setCount(newCount);
    browser.storage.local.set({ count: newCount });
  };

  return (
    <Flex direction="column" gap="4" p="5" style={{ width: '320px' }}>
      {/* Header */}
      <Flex direction="column" align="center" gap="1">
        <Heading size="6" style={{ color: color.primaryDeep }}>💰 Impulse Guard</Heading>
        <Text size="1" style={{ color: color.textMuted }}>Protecting your wallet</Text>
      </Flex>

      {/* Money saved card */}
      <Card size="3" style={{ background: gradient.cash, boxShadow: shadow.card }}>
        <Flex direction="column" align="center" gap="1">
          <Text size="1" style={{ color: 'white', textTransform: 'uppercase', letterSpacing: '0.05em', opacity: 0.85 }}>Money Saved</Text>
          <Text size="8" weight="bold" style={{ color: 'white' }}>${moneySaved.toFixed(2)}</Text>
          <Text size="1" style={{ color: 'white', opacity: 0.85 }}>↑ ${weeklySaved.toFixed(2)} this week</Text>
        </Flex>
      </Card>

      {/* Stats grid */}
      <Grid columns="3" gap="3">
        <Card style={{ boxShadow: shadow.card }}>
          <Flex direction="column" align="center" gap="1">
            <Text size="6" weight="bold" style={{ color: color.primary }}>{blockedPurchases}</Text>
            <Text size="1" style={{ color: color.textMuted }}>Blocked</Text>
          </Flex>
        </Card>
        <Card style={{ boxShadow: shadow.card }}>
          <Flex direction="column" align="center" gap="1">
            <Text size="6" weight="bold" style={{ color: color.gold }}>{impulsesResisted}</Text>
            <Text size="1" style={{ color: color.textMuted }}>Resisted</Text>
          </Flex>
        </Card>
        <Card style={{ boxShadow: shadow.card }}>
          <Flex direction="column" align="center" gap="1">
            <Text size="6" weight="bold" style={{ color: color.primary }}>{successRate}%</Text>
            <Text size="1" style={{ color: color.textMuted }}>Success</Text>
          </Flex>
        </Card>
      </Grid>

      {/* Pending card */}
      <Card style={{ background: color.backgroundMuted, borderRadius: radius.md }}>
        <Text size="2" style={{ color: color.textMuted }}>
          No pending purchases. You're doing great! 🎉
        </Text>
      </Card>

      <Button size="3" color="green" onClick={handleClick}>
        View Savings Report
      </Button>

      <Flex align="center" justify="center" gap="1">
        <Text size="1" style={{ color: color.textMuted }}>Guarding since Jan 2025 •</Text>
        <Text size="1" weight="medium" style={{ color: color.primary }}>{count} sessions</Text>
      </Flex>
    </Flex>
  );
}

export default App;