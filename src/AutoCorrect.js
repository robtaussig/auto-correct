const Trie = require('./Trie.js');
const WordPriority = require('./WordPriority.js');

const SETTINGS = {
  depth: 2
};

class AutoCorrect {
  constructor(validWords, exampleText = false) {
    this.trie = new Trie(validWords);
    this.wordPriority = new WordPriority(exampleText);
  }

  correctSentence(sentence) {
    let currentSentence = [];
    let sentenceArray = sentence.split(/\s+/);
    let wordAlternatives = {};
    let capitalizationMap;
    let punctuationMap;
    const replaceCapitalizationAndPunctuation = (word) => {
      let punctuationPointer = 0;
      let newWord = '';
      for (let i = 0; i < word.length; i++) {
        if (punctuationMap[i + punctuationPointer]) {
          newWord += punctuationMap[i];
          punctuationPointer++;
        }
        if (capitalizationMap[i]) {
          newWord += word[i].toUpperCase();
        } else {
          newWord += word[i];
        }
      }
      return newWord;
    };

    for (let i = 0; i < sentenceArray.length; i++) {
      let currentWord = sentenceArray[i];
      capitalizationMap = currentWord.split('').reduce((a, v, i) => {
        a[i] = v.toUpperCase() === v;
        return a;
      }, {});
      punctuationMap = currentWord.split('').reduce((a, v, i) => {
        a[i] = /\W/.test(v) ? v : false;
        return a;
      }, {});
      currentWord = currentWord.toLowerCase().replace(/\W/, '');
      let suggestedWords = this.suggestWords(currentWord);
      if (suggestedWords.length > 0) {
        let sortedWords = [].slice.apply(suggestedWords).sort((a, b) => {
          return this.wordPriority.wordProbability(currentWord, currentSentence[i - 1], b) - this.wordPriority.wordProbability(currentWord, currentSentence[i - 1], a);
        });
        wordAlternatives[currentWord] = sortedWords.map(el => replaceCapitalizationAndPunctuation(el));
        let bestWord = this.determineBestWord(suggestedWords, sortedWords, currentWord);
        currentSentence.push(bestWord === currentWord ? replaceCapitalizationAndPunctuation(bestWord) : replaceCapitalizationAndPunctuation(bestWord));
      } else {
        suggestedWords = Array.from(this.findAlternativesByDepth(currentWord));
        if (suggestedWords.length > 0) {
          let sortedWords = [].slice.apply(suggestedWords).sort((a, b) => {
            return this.wordPriority.wordProbability(currentWord, currentSentence[i - 1], b) - this.wordPriority.wordProbability(currentWord, currentSentence[i - 1], a);
          });
          wordAlternatives[currentWord] = sortedWords.map(el => replaceCapitalizationAndPunctuation(el));
          let bestWord = this.determineBestWord(suggestedWords, sortedWords, currentWord);
          currentSentence.push(bestWord === currentWord ? replaceCapitalizationAndPunctuation(bestWord) : replaceCapitalizationAndPunctuation(bestWord));
        } else {
          currentSentence.push(replaceCapitalizationAndPunctuation(currentWord) + '*');
        }
      }
    }
    return {
      correctedText: currentSentence.join(' '),
      wordAlternatives: wordAlternatives
    };
  }

  correctWord(inputWord) {
    let wordAlternatives = [];
    let capitalizationMap;
    let punctuationMap;
    let currentWord;
    let suggestedWords;
    let bestWord;

    const replaceCapitalizationAndPunctuation = (word) => {
      let punctuationPointer = 0;
      let newWord = '';
      for (let i = 0; i < word.length; i++) {
        if (punctuationMap[i + punctuationPointer]) {
          newWord += punctuationMap[i];
          punctuationPointer++;
        }
        if (capitalizationMap[i]) {
          newWord += word[i].toUpperCase();
        } else {
          newWord += word[i];
        }
      }
      return newWord;
    };

    capitalizationMap = inputWord.split('').reduce((a, v, i) => {
      a[i] = v.toUpperCase() === v;
      return a;
    }, {});
    punctuationMap = inputWord.split('').reduce((a, v, i) => {
      a[i] = /\W/.test(v) ? v : false;
      return a;
    }, {});
    currentWord = inputWord.toLowerCase().replace(/\W/, '');
    suggestedWords = this.suggestWords(currentWord);

    if (suggestedWords && suggestedWords.length === 0) {
      suggestedWords = Array.from(this.findAlternativesByDepth(currentWord));
      if (suggestedWords.length === 0) {
        suggestedWords = [];
        bestWord = replaceCapitalizationAndPunctuation(currentWord);
      } else {
        wordAlternatives = this.findBestMatchFromListOfAlternatives(suggestedWords, currentWord);
        bestWord = wordAlternatives[0];
      }
    } else {
      wordAlternatives = this.findBestMatchFromListOfAlternatives(suggestedWords, currentWord);
      bestWord = wordAlternatives[0];
    }

    return {
      correctedText: replaceCapitalizationAndPunctuation(bestWord),
      wordAlternatives: wordAlternatives
    };
  }

  findBestMatchFromListOfAlternatives(words, word) {
    let details = {};
    for (let i = 0; i < words.length; i++) {
      details[words[i]] = this.getDetails(word, words[i]);
      details[words[i]].sharedCharacters = this.getSharedCharacters(words[i], word);
    }

    return words.sort((a, b) => {
      return this.pickBestWordWithDetails(a, b, details);
    });
  }

  pickBestWordWithDetails(word1, word2, details) {
    if (details[word1].sharedCharacters > details[word2].sharedCharacters) {
      return -1;
    } else if (details[word1].sharedCharacters < details[word2].sharedCharacters) {
      return 1;
    } else {
      let word1Score = ((details[word1].wordCloseness / details[word2].wordCloseness)) + ((details[word1].alternativeWordCommonality / details[word2].alternativeWordCommonality));
      let word2Score = ((details[word2].wordCloseness / details[word1].wordCloseness)) + ((details[word2].alternativeWordCommonality / details[word1].alternativeWordCommonality));
      if (word1Score > word2Score) {
        return 1;
      } else {
        return -1;
      }
    }
  }

  findValidAlternativeNodes(word, position) {
    let alternatives = [];
    if (position === 0) {
      for (let firstLetter in this.trie.nodes) {
        if (firstLetter !== word[position]) {
          alternatives.push(this.trie.nodes[firstLetter]);
        }
      }
    } else {
      let currentNode = this.trie.nodes[word[0]];
      for (let i = 1; i < position; i++) {
        if (!currentNode) {
          break;
        }
        currentNode = currentNode.next[word[i]];
      }
      if (currentNode) {
        for (let child in currentNode.next) {
          if (child !== word[position]) {
            alternatives.push(currentNode.next[child]);
          }
        }
      }
    }
    return alternatives;
  }

  findValidAlternativeWords(word, position) {
    let relatives = [];
    let validAlternativeNodes = this.findValidAlternativeNodes(word, position);
    //Test whether it is possible to find a valid word by following the same path as the original word, except for the replaced letter
    for (let i = 0; i < validAlternativeNodes.length; i++) {
      let depth = 1;
      let currentNode = validAlternativeNodes[i];
      let subString = word.slice(0, position) + currentNode.value;
      while (currentNode.next[word[position + depth]] && position + depth < word.length) {
        currentNode = currentNode.next[word[position + depth]];
        subString += currentNode.value;
        depth++;
      }
      //If hit the word length and is a valid word, push into relatives array
      if (position + depth === word.length && currentNode.checkIsWord()) {
        relatives.push(subString);
      }
    }
    return relatives;
  }

  getDetails(original, alternative) {
    original = original.toLowerCase().replace(/\W/, '');
    alternative = alternative.toLowerCase().replace(/\W/, '');
    let wordCloseness = this.measureClosesness(original, alternative);
    let alternativeWordCommonality = this.getWordCommonality(alternative);

    return {
      wordCloseness,
      alternativeWordCommonality
    };
  }

  isValidWord(word) {
    if (typeof word !== 'string' || word.length < 1) return false;
    let currentNode = this.trie.nodes[word[0]];
    for (let i = 1; i < word.length; i++) {
      let nextNode = currentNode.next[word[i]];
      if (nextNode) {
        currentNode = nextNode;
      } else {
        return false;
      }
    }
    return currentNode.checkIsWord();
  }

  measureClosesness(word1, word2) {
    let distanceOfDeviations = 0;
    for (let i = 0; i < word1.length; i++) {
      if (word1[i] && word2[i] && word1[i] !== word2[i]) {
        let deviation = this.wordPriority.measureDistanceOnKeyboard(word1[i], word2[i]);
        distanceOfDeviations += deviation;
      }
    }

    return distanceOfDeviations;
  }

  sortWordsByLikelihood(suggestedWords, word) {
    return suggestedWords.sort((a, b) => {
      let keyboardClosenessA = this.measureClosesness(a.replace(/\W/g, ''), word.replace(/\W/g, ''));
      let keyboardClosenessB = this.measureClosesness(b.replace(/\W/g, ''), word.replace(/\W/g, ''));
      return keyboardClosenessA - keyboardClosenessB;
    });
  }

  determineBestWord(wordsSortedByProximity, wordsSortedByProbability, targetWord) {
    let wordMap = {};
    for (let i = 0; i < wordsSortedByProximity.length; i++) {
      wordMap[wordsSortedByProximity[i]] = {};
      wordMap[wordsSortedByProximity[i]].commonPosition = this.getWordCommonality(wordsSortedByProximity[i]);
    }
    let wordsSortedByCommonality = [].slice.apply(wordsSortedByProximity).sort((a, b) => {
      return wordMap[a].commonPosition - wordMap[b].commonPosition;
    });
    for (let j = wordsSortedByProximity.length - 1; j >= 0; j--) {
      let proximateWord = wordsSortedByProximity[j];
      let probableWord = wordsSortedByProbability[j];
      let commonWord = wordsSortedByCommonality[j];
      wordMap[proximateWord].closenessRank = 1 - (j / wordsSortedByProximity.length);
      wordMap[probableWord].probabilityRank = 1 - (j / wordsSortedByProximity.length);
      wordMap[commonWord].commonRank = 1 - (j / wordsSortedByProximity.length);
    }
    let bestWord = '';
    let bestScore = -1 / 0.0;
    for (let k = 0; k < wordsSortedByProximity.length; k++) {
      let currentWord = wordsSortedByProximity[k];
      let closenessScore = wordMap[currentWord].closenessRank;
      let probabilityScore = wordMap[currentWord].probabilityRank;
      let commonalityScore = wordMap[currentWord].commonRank;
      let sharedCharacterScore = this.getSharedCharacters(currentWord, targetWord);
      let totalScore = closenessScore * 2 + probabilityScore + commonalityScore * 3 + sharedCharacterScore * 7;
      if (totalScore > bestScore) {
        bestWord = currentWord;
        bestScore = totalScore;
      }
    }
    return bestWord;
  }

  getSharedCharacters(word1, word2) {
    let count = 0;
    for (let i = 0; i < word1.length; i++) {
      if (word1[i] === word2[i]) {
        count++;
      }
    }
    return count;
  }

  getWordCommonality(word) {
    if (typeof word !== 'string' || word.length < 1) return false;
    let currentNode = this.trie.nodes[word[0]];
    for (let i = 1; i < word.length; i++) {
      let nextNode = currentNode.next[word[i]];
      if (nextNode) {
        currentNode = nextNode;
      } else {
        return false;
      }
    }
    return currentNode.commonality;
  }

  suggestWords(word) {
    if (typeof word !== 'string' || word.length < 1) return [];

    word = word.replace(/\W/g, '');

    let suggestedWords = [];
    if (this.isValidWord(word)) {
      return [word];
    } else {
      for (let i = 0; i < word.length; i++) {
        let alternativeWords = this.findValidAlternativeWords(word, i);
        suggestedWords = suggestedWords.concat(alternativeWords);
      }
    }
    return this.sortWordsByLikelihood(suggestedWords, word);
  }

  findAlternativesByDepth(word) {
    let depth = Math.min(SETTINGS.depth, Math.floor(word.length * 0.4));
    let alternatives;
    if (word.length > 7) {
      alternatives = this.findPermutations(word, Math.max(depth - 1, 1));
    } else {
      alternatives = this.findPermutations(word, Math.max(depth, 1));
    }

    let results = new Set();
    for (let i = 0; i < alternatives.length; i++) {
      let choices = this.suggestWords(alternatives[i]);
      for (let j = 0; j < choices.length; j++) {
        results.add(choices[j]);
      }
    }
    return results;
  }

  findPermutations(word, depth = 1, alternatives = new Set()) {
    if (depth === 0) return;
    let alphabet = "abcdefghijklmnopqrstuvwxyz";
    for (let i = 0; i < word.length; i++) {
      for (let j = 0; j < alphabet.length; j++) {
        let newWord = word.slice(0, i) + alphabet[j] + word.slice(i + 1);
        this.findPermutations(newWord, depth - 1, alternatives);
        alternatives.add(newWord);
      }
    }
    return Array.from(alternatives);
  }
};

module.exports = AutoCorrect;