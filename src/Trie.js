const Node = require('./Node.js');

class Trie {
  constructor(validWords) {
    this.nodes = {};
    this.validWords = validWords;
    this.createNodes();
  }

  createNodes() {
    //length - 1 accounts for an empty line in the file
    for (let i = 0; i < this.validWords.length - 1; i++) {
      let currentWord = this.validWords[i];
      let firstLetter = currentWord[0].toLowerCase();
      let currentNode;
      if (this.nodes[firstLetter]) {
        currentNode = this.nodes[firstLetter];
      } else {
        currentNode = new Node(firstLetter);
        this.nodes[firstLetter] = currentNode;
      }
      for (let j = 1; j < currentWord.length; j++) {
        currentNode = currentNode.moveToOrCreateNode(currentWord[j].toLowerCase());
      }
      currentNode.commonality = i;
      currentNode.setIsWord();
    }
  }
};

module.exports = Trie;