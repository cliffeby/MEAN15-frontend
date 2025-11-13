/**
 * Test utility to help verify score entry protection
 * 
 * To test the match completion protection:
 * 
 * 1. Navigate to a match in score entry mode
 * 2. Open browser console and run: testMatchProtection()
 * 3. This will temporarily set the match as completed to test protection
 * 4. Try to modify scores - they should be blocked
 * 5. Try to save - button should be disabled and save should be blocked
 * 6. Run resetMatchStatus() to restore normal functionality
 */

declare global {
  interface Window {
    testMatchProtection: () => void;
    resetMatchStatus: () => void;
  }
}

// Test function to temporarily mark match as completed
window.testMatchProtection = function() {
  const component = (window as any).ng?.getComponent?.(document.querySelector('app-score-entry'));
  if (component) {
    console.log('Setting match as completed for testing...');
    component.isMatchCompleted = true;
    console.log('✅ Match marked as completed. Try modifying scores now - they should be blocked.');
    console.log('🔘 Save button should be disabled.');
    console.log('⚠️  Input fields should be readonly.');
  } else {
    console.error('Score entry component not found. Make sure you\'re on the score entry page.');
  }
};

// Reset function to restore normal functionality
window.resetMatchStatus = function() {
  const component = (window as any).ng?.getComponent?.(document.querySelector('app-score-entry'));
  if (component) {
    console.log('Resetting match status to active...');
    component.isMatchCompleted = false;
    console.log('✅ Match status reset. Score entry should work normally now.');
  } else {
    console.error('Score entry component not found. Make sure you\'re on the score entry page.');
  }
};

console.log('🧪 Score Entry Protection Test Utilities Loaded');
console.log('📝 Available commands:');
console.log('   testMatchProtection() - Test protection by marking match as completed');
console.log('   resetMatchStatus() - Reset match to active state');

export {};