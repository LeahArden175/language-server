const {NewLinkedList} = require('./NewLinkedList')

const LanguageService = {
  getUsersLanguage(db, user_id) {
    return db
      .from('language')
      .select(
        'language.id',
        'language.name',
        'language.user_id',
        'language.head',
        'language.total_score',
      )
      .where('language.user_id', user_id)
      .first()
  },

  getLanguageWords(db, language_id) {
    return db
      .from('word')
      .select(
        'id',
        'language_id',
        'original',
        'translation',
        'next',
        'memory_value',
        'correct_count',
        'incorrect_count',
      )
      .where({ language_id })
  },

  getWordsByHead(db, language_id) {
    return db
      .from('word')
      .join('language', 'word.id', '=' , 'language.head')
      .select('original', 'language_id', 'correct_count', 'incorrect_count')
      .where({language_id})
  },
  createLinkedList(words, head, total_score) {
    const ll = new NewLinkedList(words[0].language_id, 'Javascript', total_score)
    let word = words.find(item => item.id === head)
    ll.insertHead(word);

    while(word.next) {
      word = words.find(item => item.id === word.next)
      ll.insertTail(word)
    }
    return ll
  },
  postUserwords(db, linkedList){
    let arr = []
    let currentNode = linkedList.head;
    while(currentNode !== null) {
      arr.push(currentNode.value)
      currentNode = currentNode.next
    }

    return arr.map((item, index) => {
      const word = {
        memory_value : item.memory_value,
        correct_count : item.correct_count,
        incorrect_count : item.incorrect_count,
        next : arr[index + 1] ? arr[index + 1].id : null
      }
      return db('word')
        .update(word)
        .where('id', item.id)
    })
  },
  postUserLanguage(db, id, lang) {
    return db('language')
      .update(lang)
      .where('id', id)
  },
}

module.exports = LanguageService
