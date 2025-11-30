/**
 * Comprehensive test suite for Score Entry component
 * Run these tests in the browser console when on the score entry page
 */

class ScoreEntryDiagnostics {
  private component: any;
  private element: HTMLElement | null;

  constructor() {
    this.element = document.querySelector('app-score-entry');
    this.component = this.element ? (window as any).ng?.getComponent(this.element) : null;
  }

  /**
   * Test 1: Check if component is properly loaded
   */
  testComponentLoading() {
    console.group('🔍 Test 1: Component Loading');
    
    console.log('Element found:', !!this.element);
    console.log('Component found:', !!this.component);
    
    if (this.component) {
      console.log('✅ Component loaded successfully');
      console.log('Component state:', {
        loading: this.component.loading,
        saving: this.component.saving,
        isMatchCompleted: this.component.isMatchCompleted,
        playerScores: this.component.playerScores?.length || 0,
        matchId: this.component.matchId
      });
    } else {
      console.error('❌ Component not found. Make sure you\'re on the score entry page.');
    }
    
    console.groupEnd();
    return !!this.component;
  }

  /**
   * Test 2: Check form controls and reactive forms
   */
  testFormControls() {
    console.group('🔍 Test 2: Form Controls');
    
    if (!this.component) {
      console.error('❌ Component not available');
      console.groupEnd();
      return;
    }

    console.log('Form object:', this.component.scoreForm);
    console.log('Form valid:', this.component.scoreForm?.valid);
    console.log('Form controls:', this.component.scoreForm?.controls);
    
    const playersArray = this.component.scoreForm?.get('players');
    console.log('Players form array:', playersArray);
    console.log('Players array length:', playersArray?.length);
    
    if (playersArray && playersArray.length > 0) {
      console.log('First player form group:', playersArray.at(0));
      console.log('First player holes array:', playersArray.at(0)?.get('holes'));
    }
    
    console.groupEnd();
  }

  /**
   * Test 3: Check input elements and event binding
   */
  testInputElements() {
    console.group('🔍 Test 3: Input Elements');
    
    const inputs = document.querySelectorAll('app-score-entry input[type="text"]');
    console.log(`Found ${inputs.length} score input fields`);
    
    if (inputs.length > 0) {
      const firstInput = inputs[0] as HTMLInputElement;
      console.log('First input:', {
        _id: firstInput.id,
        value: firstInput.value,
        readonly: firstInput.readOnly,
        disabled: firstInput.disabled,
        formControlName: firstInput.getAttribute('formControlName')
      });
      
      // Test event listeners
      const events = ['input', 'blur', 'keydown'];
      events.forEach(eventType => {
        console.log(`${eventType} event listeners:`, this.getEventListeners(firstInput, eventType));
      });
    } else {
      console.warn('⚠️ No input fields found');
    }
    
    console.groupEnd();
  }

  /**
   * Test 4: Simulate score change event
   */
  testScoreChangeSimulation() {
    console.group('🔍 Test 4: Score Change Simulation');
    
    const inputs = document.querySelectorAll('app-score-entry input[type="text"]');
    if (inputs.length === 0) {
      console.error('❌ No input fields found to test');
      console.groupEnd();
      return;
    }

    const firstInput = inputs[0] as HTMLInputElement;
    console.log('Testing on input:', firstInput.id);
    
    // Store original value
    const originalValue = firstInput.value;
    
    try {
      // Simulate typing
      firstInput.focus();
      firstInput.value = '4';
      
      // Dispatch input event
      const inputEvent = new Event('input', { bubbles: true });
      firstInput.dispatchEvent(inputEvent);
      console.log('✅ Input event dispatched');
      
      // Dispatch blur event
      const blurEvent = new Event('blur', { bubbles: true });
      firstInput.dispatchEvent(blurEvent);
      console.log('✅ Blur event dispatched');
      
      // Check if component method was called
      setTimeout(() => {
        console.log('Input value after events:', firstInput.value);
        console.log('Component state after events:', {
          isMatchCompleted: this.component?.isMatchCompleted,
          playerScores: this.component?.playerScores?.length
        });
        
        // Restore original value
        firstInput.value = originalValue;
      }, 100);
      
    } catch (error) {
      console.error('❌ Error during simulation:', error);
    }
    
    console.groupEnd();
  }

  /**
   * Test 5: Check save button functionality
   */
  testSaveButton() {
    console.group('🔍 Test 5: Save Button');
    
    const saveButton = document.querySelector('app-score-entry button[color="primary"]') as HTMLButtonElement;
    
    if (saveButton) {
      console.log('Save button found:', {
        text: saveButton.textContent?.trim(),
        disabled: saveButton.disabled,
        classes: saveButton.className
      });
      
      // Check canSave method
      if (this.component?.canSave) {
        console.log('canSave() result:', this.component.canSave());
      }
      
      // Test click simulation
      console.log('Simulating save button click...');
      try {
        saveButton.click();
        console.log('✅ Save button click simulated');
      } catch (error) {
        console.error('❌ Error clicking save button:', error);
      }
    } else {
      console.warn('⚠️ Save button not found');
    }
    
    console.groupEnd();
  }

  /**
   * Test 6: Check method availability
   */
  testMethodAvailability() {
    console.group('🔍 Test 6: Method Availability');
    
    if (!this.component) {
      console.error('❌ Component not available');
      console.groupEnd();
      return;
    }

    const methods = ['onScoreChange', 'saveScores', 'canSave', 'loadMatchData'];
    methods.forEach(methodName => {
      const method = this.component[methodName];
      console.log(`${methodName}:`, {
        exists: typeof method === 'function',
        type: typeof method,
        bound: method?.name === methodName
      });
    });
    
    console.groupEnd();
  }

  /**
   * Test 7: Manual method invocation
   */
  testManualInvocation() {
    console.group('🔍 Test 7: Manual Method Invocation');
    
    if (!this.component) {
      console.error('❌ Component not available');
      console.groupEnd();
      return;
    }

    // Test onScoreChange manually
    if (typeof this.component.onScoreChange === 'function') {
      console.log('Testing onScoreChange manually...');
      try {
        const mockEvent = { target: { value: '5' }, preventDefault: () => {} };
        this.component.onScoreChange(0, 0, mockEvent);
        console.log('✅ onScoreChange called successfully');
      } catch (error) {
        console.error('❌ Error calling onScoreChange:', error);
      }
    }

    // Test saveScores manually  
    if (typeof this.component.saveScores === 'function') {
      console.log('Testing saveScores manually...');
      try {
        this.component.saveScores();
        console.log('✅ saveScores called successfully');
      } catch (error) {
        console.error('❌ Error calling saveScores:', error);
      }
    }
    
    console.groupEnd();
  }

  /**
   * Utility: Get event listeners (requires Chrome DevTools)
   */
  private getEventListeners(element: Element, eventType?: string) {
    const getEventListeners = (window as any).getEventListeners;
    if (typeof getEventListeners === 'function') {
      const listeners = getEventListeners(element);
      return eventType ? listeners[eventType] || [] : listeners;
    }
    return 'getEventListeners not available (open Chrome DevTools)';
  }

  /**
   * Run all tests
   */
  runAllTests() {
    console.log('🧪 Starting Score Entry Diagnostics...');
    console.log('==========================================');
    
    const componentLoaded = this.testComponentLoading();
    if (!componentLoaded) return;
    
    this.testFormControls();
    this.testInputElements();
    this.testScoreChangeSimulation();
    this.testSaveButton();
    this.testMethodAvailability();
    this.testManualInvocation();
    
    console.log('==========================================');
    console.log('🏁 Diagnostics Complete');
  }
}

// Make it globally available
declare global {
  interface Window {
    ScoreEntryDiagnostics: typeof ScoreEntryDiagnostics;
    runScoreEntryTests: () => void;
  }
}

window.ScoreEntryDiagnostics = ScoreEntryDiagnostics;
window.runScoreEntryTests = () => new ScoreEntryDiagnostics().runAllTests();

console.log('🧪 Score Entry Diagnostics Loaded');
console.log('📝 Usage: runScoreEntryTests()');
console.log('📝 Or: new ScoreEntryDiagnostics().runAllTests()');

export { ScoreEntryDiagnostics };