export function parseStringData(scorecard: any): void {
    if (!scorecard) return;
    
    // Parse par data from string if arrays are missing
    if ((!scorecard.pars || !Array.isArray(scorecard.pars)) && scorecard.parInputString) {
      scorecard.pars = parseNumberString(scorecard.parInputString);
    }
    
    // Parse handicap data from string if arrays are missing
    if ((!scorecard.hCaps || !Array.isArray(scorecard.hCaps)) && scorecard.hCapInputString) {
      scorecard.hCaps = parseNumberString(scorecard.hCapInputString);
    }
    
    // Parse yardage data from string if arrays are missing
    if ((!scorecard.yards || !Array.isArray(scorecard.yards)) && scorecard.yardsInputString) {
      scorecard.yards = parseNumberString(scorecard.yardsInputString);
    }
  }
  
function parseNumberString(inputString: string): number[] {
    if (!inputString) return [];
    
    const numbers = inputString
      .split(/[,\s\t]+/)
      .map(str => str.trim())
      .filter(str => str.length > 0)
      .map(str => parseInt(str, 10))
      .filter(num => !isNaN(num));
    
    return numbers;
  }