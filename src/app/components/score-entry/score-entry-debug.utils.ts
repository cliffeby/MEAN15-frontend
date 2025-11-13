/**
 * Simple debugging utilities for score-entry component
 * Copy these methods into your ScoreEntryComponent class for debugging
 */

export const scoreEntryDebugMethods = `
  // Add these methods to your ScoreEntryComponent class

  debugEventBinding() {
    console.log('🔍 Debug Event Binding Check');
    console.log('Component state:', {
      loading: this.loading,
      saving: this.saving,
      isMatchCompleted: this.isMatchCompleted,
      playerScores: this.playerScores?.length,
      canSave: this.canSave()
    });
    
    console.log('Methods available:', {
      onScoreChange: typeof this.onScoreChange,
      saveScores: typeof this.saveScores,
      canSave: typeof this.canSave
    });
  }

  debugOnScoreChange() {
    console.log('🔍 Testing onScoreChange manually');
    
    if (!this.playerScores || this.playerScores.length === 0) {
      console.error('❌ No player scores available');
      return;
    }
    
    const mockEvent = {
      target: { value: '4' },
      preventDefault: () => console.log('preventDefault called')
    };
    
    try {
      this.onScoreChange(0, 0, mockEvent);
      console.log('✅ onScoreChange executed');
    } catch (error) {
      console.error('❌ onScoreChange failed:', error);
    }
  }

  debugSaveScores() {
    console.log('🔍 Testing saveScores manually');
    
    try {
      this.saveScores();
      console.log('✅ saveScores executed');
    } catch (error) {
      console.error('❌ saveScores failed:', error);
    }
  }

  debugFormState() {
    console.log('🔍 Form State Debug');
    console.log('Form object:', this.scoreForm);
    console.log('Form valid:', this.scoreForm?.valid);
    console.log('Form value:', this.scoreForm?.value);
    
    const playersArray = this.scoreForm?.get('players');
    console.log('Players array:', {
      exists: !!playersArray,
      length: playersArray?.length,
      controls: playersArray?.controls?.length
    });
    
    if (playersArray && playersArray.length > 0) {
      console.log('First player form:', playersArray.at(0)?.value);
    }
  }
`;