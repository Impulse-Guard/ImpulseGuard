import { useState, useEffect } from 'react';
import type { StorageData } from './content/storage';
import browser from 'webextension-polyfill';
import { Button, Card, Text, Heading, Flex, Grid } from '@radix-ui/themes';

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
        <Heading size="6">💰 Impulse Guard</Heading>
        <Text size="1" color="gray">Protecting your wallet</Text>
      </Flex>

      {/* Money saved card */}
      <Card size="3" style={{ background: 'linear-gradient(to bottom right, var(--green-10), var(--green-11))' }}>
        <Flex direction="column" gap="1">
          <Text size="1" style={{ textTransform: 'uppercase', letterSpacing: '0.05em', opacity: 0.8 }}>Money Saved</Text>
          <Text size="8" weight="bold" color="white">${moneySaved.toFixed(2)}</Text>
          <Text size="1" style={{ opacity: 0.8 }}>↑ ${weeklySaved.toFixed(2)} this week</Text>
        </Flex>
      </Card>

      {/* Stats grid */}
      <Grid columns="3" gap="3">
        <Card>
          <Flex direction="column" align="center" gap="1">
            <Text size="6" weight="bold" color="amber">{blockedPurchases}</Text>
            <Text size="1" color="gray">Blocked</Text>
          </Flex>
        </Card>
        <Card>
          <Flex direction="column" align="center" gap="1">
            <Text size="6" weight="bold" color="yellow">{impulsesResisted}</Text>
            <Text size="1" color="gray">Resisted</Text>
          </Flex>
        </Card>
        <Card>
          <Flex direction="column" align="center" gap="1">
            <Text size="6" weight="bold" color="green">{successRate}%</Text>
            <Text size="1" color="gray">Success</Text>
          </Flex>
        </Card>
      </Grid>

      {/* Pending card */}
      <Card>
        <Text size="2" color="gray">
          No pending purchases. You're doing great! 🎉
        </Text>
      </Card>

      <Button size="3" onClick={handleClick}>
        View Savings Report
      </Button>

      <Flex align="center" justify="center" gap="1">
        <Text size="1" color="gray">Guarding since Jan 2025 •</Text>
        <Text size="1" color="green" weight="medium">{count} sessions</Text>
      </Flex>
    </Flex>
  );
}

export default App;