/* eslint-disable no-undef */
// MAKE SURE TO CREATE TABLE IN THE TEST DATABASE!!!
// RUN psql -U postgres -d connectivity-test -f ./migrations/001.do.create_posts_table.sql
// DON'T SEED THE TEST DATABASE --- ARTICLES.FIXTURES.JS WILL PROVIDE TESTING DATA

// MAKE SURE TO ADD TO .env   TEST_DB_URL="postgresql://db-owner@localhost/db-name-test"

// USE .only TO RUN ONE TEST SUITE AT A TIME TO START UPDATING TO PROJECT SPECIFICS

const knex = require('knex')
const app = require('../src/app')
const {makeArticlesArray} = require('./articles.fixtures')
const {makeMaliciousArticle} = require('./articles.fixtures')


// UPDATE PROJECT TABLE NAME
const tableName = 'project-table-name'


describe('Articles Endpoints', function(){
    let db

    before('make knex instance', () => {
        db = knex({
            client: 'pg',
            connection: process.env.TEST_DB_URL,
        })
        app.set('db', db)
    })

    after('disconnect from db', () => db.destroy())

    before('clean the table', () => db(`${tableName}`).truncate())

    afterEach('cleanup', () => db(`${tableName}`).truncate())

    describe(`GET /api/articles`, ()=> {
        context(`Given no articles`, () => {
            it(`responds with 200 and an empty list`, () => {
                return supertest(app)
                    .get('/api/articles')
                    .expect(200, [])
            })
        })

        context('Given there are articles in the database', () => {
            const testArticles = makeArticlesArray()
    
            beforeEach('insert articles', () => {
                return db
                    .into(`${tableName}`)
                    .insert(testArticles)
            })
    
            it('GET /api/articles responds with 200 and all of the articles', () => {
                return supertest(app)
                .get('/api/articles')
                .expect(200, testArticles)
            })
        })

        context(`Given an XSS attack article`, () => {
 
            const { maliciousArticle, expectedArticle } = makeMaliciousArticle()
      
            beforeEach('insert malicious article', () => {
              return db
                .into(`${tableName}`)
                .insert([ maliciousArticle ])
            })
      
            it('removes XSS attack content', () => {
              return supertest(app)
                .get(`/api/articles`)
                .expect(200)
                .expect(res => {
                  expect(res.body[0].title).to.eql(expectedArticle.title)
                  expect(res.body[0].content).to.eql(expectedArticle.content)
                })
            })
        })

    })

    describe(`GET /api/articles/:article_id`, () => {
        context(`Given no articles`, () => {
            it(`responds with 404`, () => {
                const articleId = 123456
                return supertest(app)
                    .get(`/api/articles/${articleId}`)
                    .expect(404, {error: {message:`Article doesn't exist`} })
            })
        })
        
        context('Given there are articles in the database', () => {
            const testArticles = makeArticlesArray()

            beforeEach('insert articles', () => {
                return db
                .into(`${tableName}`)
                .insert(testArticles)
            })

            it('GET /api/articles/:article_id responds with 200 and the specified article', () => {
            const articleId = 2
            const expectedArticle = testArticles[articleId - 1]
            return supertest(app)
                .get(`/api/articles/${articleId}`)
                .expect(200, expectedArticle) 
                })
            })

        context(`Given an XSS attack article`, () => {
            const { maliciousArticle, expectedArticle } = makeMaliciousArticle()

            beforeEach('insert malicious article', () => {
              return db
                .into(`${tableName}`)
                .insert([ maliciousArticle ])
            })

            it('removes XSS attack content', () => {
              return supertest(app)
                .get(`/api/articles/${maliciousArticle.id}`)
                .expect(200)
                .expect(res => {
                  expect(res.body.title).to.eql(expectedArticle.title)
                  expect(res.body.content).to.eql(expectedArticle.content)
                })
            })
        })    
    })

    describe(`POST /api/articles`, () => {
            // this might occasionally return a false fail because of newDate()
            // if test runs towards the end of a millisecond, then the seconds will be different
            // we can use .retries here to resolve this .. statistically speaking, it shouldn't fail three times in a row...
        it(`creates an article, responding with 201 and the new article`, function() {
            this.retries(3)
            const newArticle = {
                title: 'Test new article',
                style: 'Listicle',
                content: 'Test new article content...'
            }
            return supertest(app)
            .post('/api/articles')
            .send(newArticle)
            .expect(201)
            .expect(res => {
                expect(res.body.title).to.eql(newArticle.title)
                expect(res.body.style).to.eql(newArticle.style)
                expect(res.body.content).to.eql(newArticle.content)
                expect(res.body).to.have.property('id')
                expect(res.headers.location).to.eql(`/api/articles/${res.body.id}`)
                const expected = new Date().toLocaleString()
                const actual = new Date(res.body.date_published).toLocaleString()
                expect(actual).to.eql(expected)
            })
            .then(postRes =>
                supertest(app)
                .get(`/api/articles/${postRes.body.id}`)
                .expect(postRes.body)
            )
        })

        const requiredFields = [ 'title', 'style', 'content' ]

        requiredFields.forEach(field => {
            const newArticle = {
                title: 'Test new article',
                style: 'Listicle',
                content: 'Test new article content...'
            }

            it(`responds with 400 and an error message when the '${field}' is missing`, () => {
                delete newArticle[field]

                return supertest(app)
                .post('/api/articles')
                .send(newArticle)
                .expect(400, {
                    error: { message: `Missing '${field}' in request body` }
                })
            })
        })
        
            it('removes XSS attack content from response', () => {
                const { maliciousArticle, expectedArticle } = makeMaliciousArticle()
                return supertest(app)
                .post(`/api/articles`)
                .send(maliciousArticle)
                .expect(201)
                .expect(res => {
                    expect(res.body.title).to.eql(expectedArticle.title)
                    expect(res.body.content).to.eql(expectedArticle.content)
                })
            })
    })

    describe(`DELETE /api/articles/:article_id`, () => {
       context(`Given no articles`, () => {
            it(`responds with 404`, () => {
            const articleId = 123456
            return supertest(app)
                .delete(`/api/articles/${articleId}`)
                .expect(404, { error: { message: `Article doesn't exist` } })
            })
        })
        
        
        context('Given there are articles in the database', () => {
            const testArticles = makeArticlesArray()
        
        beforeEach('insert articles', () => {
            return db
              .into(`${tableName}`)
              .insert(testArticles)
          })
        
        it('responds with 204 and removes the article', () => {
            const idToRemove = 2
            const expectedArticles = testArticles.filter(article => article.id !== idToRemove)
            return supertest(app)
              .delete(`/api/articles/${idToRemove}`)
              .expect(204)
              // eslint-disable-next-line no-unused-vars
              .then(res =>
                supertest(app)
                  .get(`/api/articles`)
                  .expect(expectedArticles)
              )
          })
        })
    })

    describe(`PATCH /api/articles/:article_id`, () => {
        context(`Given no articles`, () => {
            it(`responds with 404`, () => {
                const articleId = 123456
                return supertest(app)
                    .patch(`/api/articles/${articleId}`)
                    .expect(404, { error: { message: `Article doesn't exist`}})
            })
        })

        context('Given there are articles in the database', () => {
            const testArticles = makeArticlesArray()

            beforeEach('insert articles', () => {
                return db
                    .into(`${tableName}`)
                    .insert(testArticles)
            })

            it('responds with 204 and updates the article', () => {
                const idToUpdate = 2
                const updateArticle = {
                    title: 'updated article title',
                    style: 'Interview',
                    content: 'updated article content',    
                }
                const expectedArticle = {
                    ...testArticles[idToUpdate - 1],
                    ...updateArticle
                }
                return supertest(app)
                    .patch(`/api/articles/${idToUpdate}`)
                    .send(updateArticle)
                    .expect(204)
                    // eslint-disable-next-line no-unused-vars
                    .then(res =>
                        supertest(app)
                            .get(`/api/articles/${idToUpdate}`)
                            .expect(expectedArticle)
                    )
            })

            it(`responds with 400 when no required fields supplied`, () => {
                const idToUpdate = 2
                return supertest(app)
                    .patch(`/api/articles/${idToUpdate}`)
                    .send({ irrelevantField: 'foo' })
                    .expect(400, {
                        error: {
                            message: `Request body must contain either 'title', 'style', or 'content'` 
                        }
                })
            })

            it(`responds with 204 when updating only a subset of fields`, () => {
                    const idToUpdate = 2
                    const updateArticle = {
                      title: 'updated article title',
                    }
                    const expectedArticle = {
                      ...testArticles[idToUpdate - 1],
                      ...updateArticle
                    }
                    return supertest(app)
                      .patch(`/api/articles/${idToUpdate}`)
                      .send({
                        ...updateArticle,
                        fieldToIgnore: 'should not be in GET response'
                      })
                      .expect(204)
                      // eslint-disable-next-line no-unused-vars
                      .then(res =>
                        supertest(app)
                          .get(`/api/articles/${idToUpdate}`)
                          .expect(expectedArticle)
                      )
            })
        })

    })
})

