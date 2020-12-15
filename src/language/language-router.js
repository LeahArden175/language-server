const express = require('express')
const LanguageService = require('./language-service')
const { requireAuth } = require('../middleware/jwt-auth')

const languageRouter = express.Router()
const bodyParser = express.json()

languageRouter
  .use(requireAuth)
  .use(async (req, res, next) => {
    try {
      const language = await LanguageService.getUsersLanguage(
        req.app.get('db'),
        req.user.id,
      )

      if (!language)
        return res.status(404).json({
          error: `You don't have any languages`,
        })

      req.language = language
      next()
    } catch (error) {
      next(error)
    }
  })

languageRouter
  .get('/', async (req, res, next) => {
    try {
      const words = await LanguageService.getLanguageWords(
        req.app.get('db'),
        req.language.id,
      )

      res.json({
        language: req.language,
        words,
      })
      next()
    } catch (error) {
      next(error)
    }
  })

languageRouter
  .get('/head', async (req, res, next) => {
    try {
      const [nextWord] = await LanguageService.getWordsByHead(
        req.app.get('db'),
        req.language.id
      )
      res.json({
        nextWord : nextWord.original,
        totalScore : req.language.total_score,
        wordCorrectCount : nextWord.correct_count,
        wordIncorrectCount : nextWord.incorrect_count
      })
      next()
    } catch (error) {
      next(error)
    }
  })

languageRouter
  .post('/guess', bodyParser, async (req, res, next) => {
    const { guess } = req.body;

    try {
      if(!req.body.guess) {
        res.status(400).json({ error : `Missing 'guess' in request body`})
        return;
      }
      const words = await LanguageService.getLanguageWords(
        req.app.get('db'),
        req.language.id
      )
      const language = await LanguageService.getUsersLanguage(
        req.app.get('db'),
        req.user.id
      )
      const list = LanguageService.createLinkedList(words, language.head, language.total_score)

      let isCorrect;
      let currentNode = list.head;

      let answer = currentNode.value.translation;

      if(guess === answer) {
        isCorrect = true;
        currentNode.value.memory_value = parseInt(currentNode.value.memory_value * 2)
        currentNode.value.correct_count = parseInt(currentNode.value.correct_count + 1)
        console.log(currentNode.value.correct_count)
        language.total_score = language.total_score + 1
      } else {
        isCorrect = false;
        currentNode.value.incorrect_count = currentNode.value.incorrect_count + 1;
        currentNode.value.memory_value = 1
      }

      list.shiftHeadBy(currentNode.value.memory_value)
      console.log(currentNode.value)

      const lang = {
        head : list.head.value.id,
        total_score : language.total_score
      }
      console.log('lang', lang)

      await Promise.all([LanguageService.postUserLanguage (
        req.app.get('db'),
        currentNode.value.language_id,
        lang
      ), ...LanguageService.postUserwords(
        req.app.get('db'),
        list
      )])

      res.json({
        nextWord : list.head.value.original,
        wordCorrectCount : list.head.value.correct_count,
        wordIncorrectCount : list.head.value.incorrect_count,
        totalScore : language.total_score,
        answer: answer,
        isCorrect : isCorrect
      })

    } catch(error) {
      next(error)
    }
  })

module.exports = languageRouter
