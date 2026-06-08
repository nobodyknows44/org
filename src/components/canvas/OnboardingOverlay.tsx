'use client';

import { useState, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { X, Plus, GitBranch, LayoutGrid } from 'lucide-react';

const ONBOARDING_KEY = 'orgcanvas_onboarding_complete';

const steps = [
  {
    icon: Plus,
    title: 'Create Nodes',
    description: 'Double-click on the canvas to create a new node. Edit fields by clicking on a node to open the inspector.',
  },
  {
    icon: GitBranch,
    title: 'Connect Nodes',
    description: 'Drag from a node handle (small dot) to another node to create a relationship. In ownership mode, edges can carry ownership percentages.',
  },
  {
    icon: LayoutGrid,
    title: 'Auto Layout',
    description: 'Click the grid icon in the toolbar to automatically arrange all nodes. Choose layout direction from the dropdown.',
  },
];

export function OnboardingOverlay() {
  const [visible, setVisible] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const done = localStorage.getItem(ONBOARDING_KEY);
      if (!done) {
        setVisible(true);
      }
    }
  }, []);

  const handleSkip = useCallback(() => {
    setVisible(false);
    localStorage.setItem(ONBOARDING_KEY, 'true');
  }, []);

  const handleNext = useCallback(() => {
    if (step < steps.length - 1) {
      setStep(step + 1);
    } else {
      handleSkip();
    }
  }, [step, handleSkip]);

  if (!visible) return null;

  const currentStep = steps[step];
  const Icon = currentStep.icon;

  return (
    <div className="fixed inset-0 z-[100] bg-black/50 flex items-center justify-center">
      <div className="bg-background rounded-xl shadow-2xl max-w-sm w-full mx-4 p-6 relative">
        <button
          className="absolute top-3 right-3 text-muted-foreground hover:text-foreground"
          onClick={handleSkip}
        >
          <X className="h-4 w-4" />
        </button>

        <div className="flex flex-col items-center text-center">
          <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mb-4">
            <Icon className="h-7 w-7 text-primary" />
          </div>

          <h3 className="text-lg font-semibold mb-2">{currentStep.title}</h3>
          <p className="text-sm text-muted-foreground mb-6">{currentStep.description}</p>

          {/* Progress dots */}
          <div className="flex items-center gap-2 mb-4">
            {steps.map((_, i) => (
              <div
                key={i}
                className={`w-2 h-2 rounded-full transition-colors ${
                  i === step ? 'bg-primary' : 'bg-muted'
                }`}
              />
            ))}
          </div>

          <div className="flex items-center gap-3 w-full">
            <Button variant="ghost" size="sm" className="flex-1" onClick={handleSkip}>
              Skip
            </Button>
            <Button size="sm" className="flex-1" onClick={handleNext}>
              {step < steps.length - 1 ? 'Next' : 'Get Started'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
