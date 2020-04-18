/* eslint-disable no-undef */
// MAKE SURE TO CREATE TABLE THROUGH MIGRATIONS IN THE TEST DATABASE!!!
// RUN psql -U postgres -d connectivity-test -f ./migrations/001.do.create_posts_table.sql
// DON'T SEED THE TEST DATABASE --- FOLDERS.FIXTURES.JS WILL PROVIDE TESTING DATA

// MAKE SURE TO ADD TO .env   TEST_DB_URL="postgresql://db-owner@localhost/db-name-test"

// USE .only TO RUN ONE TEST SUITE AT A TIME TO START UPDATING TO PROJECT SPECIFICS

const knex = require('knex')
const app = require('../src/app')
const {makeFoldersArray} = require('./folders.fixtures')
const {makeNotesArray} = require('./notes.fixtures')
const {makeMaliciousFolder} = require('./folders.fixtures')


describe('Folders Endpoints', function(){
    let db

    before('make knex instance', () => {
        db = knex({
            client: 'pg',
            connection: process.env.TEST_DB_URL,
        })
        app.set('db', db)
    })

    after('disconnect from db', () => db.destroy())

    before('clean the table', () => db.raw('TRUNCATE folders, notes RESTART IDENTITY CASCADE'))

    afterEach('cleanup',() => db.raw('TRUNCATE folders, notes RESTART IDENTITY CASCADE'))

    describe(`GET /api/folders`, ()=> {
        context(`Given no folders`, () => {
            it(`responds with 200 and an empty list`, () => {
                return supertest(app)
                    .get('/api/folders')
                    .expect(200, [])
            })
        })

        context('Given there are folders in the database', () => {
            const testNotes = makeNotesArray()
            const testFolders = makeFoldersArray()
    
            beforeEach('insert folders', () => {
                return db
                .into('notes')
                .insert(testNotes)
                .then(() => {
                  return db
                    .into('folders')
                    .insert(testFolders)
                })
            })
    
            it('GET /api/folders responds with 200 and all of the folders', () => {
                return supertest(app)
                .get('/api/folders')
                .expect(200, testFolders)
            })
        })

        context(`Given an XSS attack folder`, () => {
            const testNotes = makeNotesArray()
            const { maliciousFolder, expectedFolder } = makeMaliciousFolder()
      
            beforeEach('insert malicious folder', () => {
                return db
                .into('notes')
                .insert(testNotes)
                .then(() => {
                  return db
                    .into('folders')
                    .insert([maliciousFolder])
                })
            })
      
            it('removes XSS attack content', () => {
              return supertest(app)
                .get(`/api/folders`)
                .expect(200)
                .expect(res => {
                  expect(res.body[0].title).to.eql(expectedFolder.title)
                  expect(res.body[0].content).to.eql(expectedFolder.content)
                })
            })
        })

    })

    describe(`GET /api/folders/:folder_id`, () => {
        context(`Given no folders`, () => {
            it(`responds with 404`, () => {
                const folder_id = 123456
                return supertest(app)
                    .get(`/api/folders/${folder_id}`)
                    .expect(404, {error: {message:`Folder doesn't exist`} })
            })
        })
        
        context('Given there are folders in the database', () => {
            const testNotes = makeNotesArray()
            const testFolders = makeFoldersArray()

            beforeEach('insert folders', () => {
                return db
                .into('notes')
                .insert(testNotes)
                .then(() => {
                  return db
                    .into('folders')
                    .insert(testFolders)
                })
            })

            it('GET /api/folders/:folder_id responds with 200 and the specified folder', () => {
            const folder_id = 2
            const expectedFolder = testFolders[folder_id - 1]
            return supertest(app)
                .get(`/api/folders/${folder_id}`)
                .expect(200, expectedFolder) 
                })
            })

        context(`Given an XSS attack folder`, () => {
            const testNotes = makeNotesArray()
            const { maliciousFolder, expectedFolder } = makeMaliciousFolder()

            beforeEach('insert malicious folder', () => {
                return db
                .into('notes')
                .insert(testNotes)
                .then(() => {
                  return db
                    .into('folders')
                    .insert([maliciousFolder])
                })
            })

            it('removes XSS attack content', () => {
              return supertest(app)
                .get(`/api/folders/${maliciousFolder.id}`)
                .expect(200)
                .expect(res => {
                  expect(res.body.title).to.eql(expectedFolder.title)
                  expect(res.body.content).to.eql(expectedFolder.content)
                })
            })
        })    
    })

    describe(`POST /api/folders`, () => {
            // this might occasionally return a false fail because of newDate()
            // if test runs towards the end of a millisecond, then the seconds will be different
            // we can use .retries here to resolve this .. statistically speaking, it shouldn't fail three times in a row...
        it(`creates an folder, responding with 201 and the new folder`, function() {
            this.retries(3)
            const newFolder = {
                title: 'Test new folder',
                style: 'Listicle',
                content: 'Test new folder content...'
            }
            return supertest(app)
            .post('/api/folders')
            .send(newFolder)
            .expect(201)
            .expect(res => {
                expect(res.body.title).to.eql(newFolder.title)
                expect(res.body.style).to.eql(newFolder.style)
                expect(res.body.content).to.eql(newFolder.content)
                expect(res.body).to.have.property('id')
                expect(res.headers.location).to.eql(`/api/folders/${res.body.id}`)
                const expected = new Date().toLocaleString()
                const actual = new Date(res.body.date_published).toLocaleString()
                expect(actual).to.eql(expected)
            })
            .then(postRes =>
                supertest(app)
                .get(`/api/folders/${postRes.body.id}`)
                .expect(postRes.body)
            )
        })

        const requiredFields = [ 'name' ]

        requiredFields.forEach(field => {
            const newFolder = {
                name: 'Test new folder'
            }

            it(`responds with 400 and an error message when the '${field}' is missing`, () => {
                delete newFolder[field]

                return supertest(app)
                .post('/api/folders')
                .send(newFolder)
                .expect(400, {
                    error: { message: `Missing '${field}' in request body` }
                })
            })
        })
        
            it('removes XSS attack content from response', () => {
                const { maliciousFolder, expectedFolder } = makeMaliciousFolder()
                return supertest(app)
                .post(`/api/folders`)
                .send(maliciousFolder)
                .expect(201)
                .expect(res => {
                    expect(res.body.title).to.eql(expectedFolder.title)
                    expect(res.body.content).to.eql(expectedFolder.content)
                })
            })
    })

    describe(`DELETE /api/folders/:folder_id`, () => {
       context(`Given no folders`, () => {
            it(`responds with 404`, () => {
            const folder_id = 123456
            return supertest(app)
                .delete(`/api/folders/${folder_id}`)
                .expect(404, { error: { message: `Folder doesn't exist` } })
            })
        })
        
        
        context('Given there are folders in the database', () => {
            const testNotes = makeNotesArray()
            const testFolders = makeFoldersArray()
        
        beforeEach('insert folders', () => {
            return db
            .into('notes')
            .insert(testNotes)
            .then(() => {
              return db
                .into('folders')
                .insert(testNotes)
            })
        })
        
        it('responds with 204 and removes the folder', () => {
            const idToRemove = 2
            const expectedFolders = testFolders.filter(folder => folder.id !== idToRemove)
            return supertest(app)
              .delete(`/api/folders/${idToRemove}`)
              .expect(204)
              // eslint-disable-next-line no-unused-vars
              .then(res =>
                supertest(app)
                  .get(`/api/folders`)
                  .expect(expectedFolders)
              )
          })
        })
    })

    describe(`PATCH /api/folders/:folder_id`, () => {
        context(`Given no folders`, () => {
            it(`responds with 404`, () => {
                const folder_id = 123456
                return supertest(app)
                    .patch(`/api/folders/${folder_id}`)
                    .expect(404, { error: { message: `Folder doesn't exist`}})
            })
        })

        context('Given there are folders in the database', () => {
            const testNotes = makeNotesArray()
            const testFolders = makeFoldersArray()

            beforeEach('insert folders', () => {
                return db
                .into('notes')
                .insert(testNotes)
                .then(() => {
                  return db
                    .into('folders')
                    .insert(testFolders)
                })
            })

            it('responds with 204 and updates the folder', () => {
                const idToUpdate = 2
                const updateFolder = {
                    title: 'updated folder title',
                    style: 'Interview',
                    content: 'updated folder content',    
                }
                const expectedFolder = {
                    ...testFolders[idToUpdate - 1],
                    ...updateFolder
                }
                return supertest(app)
                    .patch(`/api/folders/${idToUpdate}`)
                    .send(updateFolder)
                    .expect(204)
                    // eslint-disable-next-line no-unused-vars
                    .then(res =>
                        supertest(app)
                            .get(`/api/folders/${idToUpdate}`)
                            .expect(expectedFolder)
                    )
            })

            it(`responds with 400 when no required fields supplied`, () => {
                const idToUpdate = 2
                return supertest(app)
                    .patch(`/api/folders/${idToUpdate}`)
                    .send({ irrelevantField: 'foo' })
                    .expect(400, {
                        error: {
                            message: `Request body must contain 'body'` 
                        }
                })
            })

            it(`responds with 204 when updating only a subset of fields`, () => {
                    const idToUpdate = 2
                    const updateFolder = {
                      title: 'updated folder title',
                    }
                    const expectedFolder = {
                      ...testFolders[idToUpdate - 1],
                      ...updateFolder
                    }
                    return supertest(app)
                      .patch(`/api/folders/${idToUpdate}`)
                      .send({
                        ...updateFolder,
                        fieldToIgnore: 'should not be in GET response'
                      })
                      .expect(204)
                      // eslint-disable-next-line no-unused-vars
                      .then(res =>
                        supertest(app)
                          .get(`/api/folders/${idToUpdate}`)
                          .expect(expectedFolder)
                      )
            })
        })

    })
})


