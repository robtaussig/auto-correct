var fs = require('fs');

class MarkovChain {
  constructor(sampleText, fromFile = false) {
    this.chain = {};
    this.sentenceStarters = {};
    this.createChain(sampleText, fromFile);
  }

  createChain(sampleText, fromFile) {
    let wordArray;
    if (fromFile) {
      wordArray = fs.readFileSync(sampleText, "utf-8").replace(/\n/g, " ").split(/\s+/);
    } else {
      wordArray = sampleText.split(/\s+/);
    }
    this.sentenceStarters[wordArray[0]] = 1;
    this.sentenceStarters.totalWords = 1;

    for (let i = 0; i < wordArray.length; i++) {
      let currentWord = wordArray[i];
      let nextWord;
      let punctuation = currentWord.match(/[^A-Za-z'"]/);
      if (punctuation) {

        if (punctuation.index === 0) {
          currentWord = currentWord.substr(1);
        } else if (punctuation.index === currentWord.length - 1) {
          currentWord = currentWord.substr(0, currentWord.length - 1);
        }

        nextWord = punctuation[0];
        if (nextWord === '.' && wordArray[i + 1]) {
          this.sentenceStarters[wordArray[i + 1]] = this.sentenceStarters[wordArray[i + 1]] || 0;
          this.sentenceStarters[wordArray[i + 1]]++;
          this.sentenceStarters.totalWords++;
        } else if (punctuation.index === currentWord.length && wordArray[i + 1]) {
          this.chain[nextWord] = this.chain[nextWord] || { totalWords: 0 };
          this.chain[nextWord][wordArray[i + 1].replace(/\W/g, '')] = this.chain[nextWord][wordArray[i + 1].replace(/\W/g, '')] || 0;
          this.chain[nextWord][wordArray[i + 1].replace(/\W/g, '')]++;
          this.chain[nextWord].totalWords++;
        }
      } else if (wordArray[i + 1]) {
        nextWord = wordArray[i + 1].replace("[^\\w']+", '');
      }
      currentWord = currentWord.replace(/\W/g, '');
      this.chain[currentWord] = this.chain[currentWord] || { totalWords: 0 };
      this.chain[currentWord][nextWord] = this.chain[currentWord][nextWord] || 0;
      this.chain[currentWord][nextWord]++;
      this.chain[currentWord].totalWords++;
    }
  }

  pickNextWord(word) {
    let returnWord;
    for (let nextWord in word) {
      if (nextWord !== 'totalWords') {
        returnWord = nextWord;
        if ((word[nextWord] / word.totalWords) >= Math.random()) {
          return returnWord;
        }
      }
    }
    return returnWord;
  }

  generateNewSentence() {
    let currentWord = this.pickNextWord(this.sentenceStarters).replace(/\W/g, '');
    let returnSentence = currentWord;
    while (currentWord && !['.', '?', '!'].includes(currentWord)) {
      currentWord = this.pickNextWord(this.chain[currentWord]) || "";
      if (currentWord.length > 1) {
        currentWord = currentWord.replace(/\W/g, '');
      }
      if (['.', ',', ';', "'", ':'].includes(currentWord)) {
        returnSentence += currentWord;
      } else if (currentWord && !["(", ")"].includes(currentWord)) {
        returnSentence += ' ' + currentWord;
      }

      let punctuation = currentWord.match(/[^A-Za-z'"]/);
      if (punctuation && punctuation.index === currentWord.length - 1) {
        currentWord = punctuation[0];
      }
    }
    return returnSentence;
  }

  sortByMostLikelyNextWord(previousWord, options) {
    return options.sort((a, b) => {
      return this.chain[previousWord][b] - this.chain[previousWord][a];
    });
  }
}

module.exports = MarkovChain;