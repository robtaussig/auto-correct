class Node {
  constructor(value) {
    this.next = {};
    this.isWord = false;
    this.value = value;
  }

  moveToOrCreateNode(value) {
    let returnValue;
    //Create new node if it doesn't exist
    if (!this.next[value]) {
      returnValue = new Node(value);
      this.next[value] = returnValue;
    }
    //Otherwise, move to it
    else {
      returnValue = this.next[value];
    }
    return returnValue;
  }

  checkIsWord() {
    return this.isWord;
  }

  setIsWord() {
    this.isWord = true;
  }
};

module.exports = Node;