/* eslint-disable no-undef */

const knex = require('knex')
const app = require('../src/app')
const {makeFoldersArray} = require('./folders.fixtures')
const {makeNotesArray} = require('./notes.fixtures')

describe('Notes Endpoints', function(){
    let db

    before('make knex instance', () => {
        db = knex({
            client: 'pg',
            connection: process.env.TEST_DATABASE_URL,
        })
        app.set('db', db)
    })

    after('disconnect from db', () => db.destroy())

    before('clean the table', () => db.raw('TRUNCATE folders, notes RESTART IDENTITY CASCADE'))

    afterEach('cleanup',() => db.raw('TRUNCATE folders, notes RESTART IDENTITY CASCADE'))

    describe(`GET /api/notes`, ()=> {
        context(`Given no notes`, () => {
            it(`responds with 200 and an empty list`, () => {
                return supertest(app)
                    .get('/api/notes')
                    .expect(200, [])
            })
        })

        context('Given there are notes in the database', () => {
            const testNotes = makeNotesArray()
            const testFolders = makeFoldersArray()
    
            beforeEach('insert notes', () => {
                return db
                .into('folders')
                .insert(testFolders)
                .then(() => {
                  return db
                    .into('notes')
                    .insert(testNotes)
                })
            })
    
            it('GET /api/notes responds with 200 and all of the folders', () => {
                return supertest(app)
                .get('/api/notes')
                .expect(200, testNotes)
            })
        })

        context(`Given an XSS attack note`, () => {
            const testFolders = makeFoldersArray()

            const maliciousNote = 

                {
                    "id": "911",
                    "name": "Naughty naughty very naughty <script>alert('xss');</script>",
                    "modified": "2018-08-20T23:00:00.000Z",
                    "content": 'Fixture Bad image <img src="https://url.to.file.which/does-not.exist" onerror="alert(document.cookie);">. But not <strong>all</strong> bad.',
                    "folderid": "1"
                }


            const expectedNote = 
              
            {
                "id": "911",
                "name": "Naughty naughty very naughty &lt;script&gt;alert('xss');&lt;/script&gt;",
                "modified": "2018-08-20T23:00:00.000Z",
                "content": 'Fixture Bad image <img src="https://url.to.file.which/does-not.exist">. But not <strong>all</strong> bad.',
                "folderid": "1"
            } 
      
            beforeEach('insert malicious note', () => {
                return db
                .into('folders')
                .insert(testFolders)
                .then(() => {
                    return db
                      .into('notes')
                      .insert(maliciousNote)
                })
                console.log(res)
            })
            it('removes XSS attack content', () => {
              return supertest(app)
                .get(`/api/notes`)
                .expect(200)
                .expect(res => {
                  expect(res.body[0].name).to.equal(expectedNote.name)
                  expect(res.body[0].content).to.equal(expectedNote.content)
                })
            })
        })

    })

    describe(`GET /api/notes/:noteId`, () => {
        context(`Given no notes`, () => {
            it(`responds with 404`, () => {
                const NoteId = "123456"
                return supertest(app)
                    .get(`/api/notes/${NoteId}`)
                    .expect(404, {error: {message:`Note doesn't exist`} })
            })
        })
        
        context('Given there the note is in the database', () => {
            const testNotes = makeNotesArray()
            const testFolders = makeFoldersArray()

            beforeEach('insert notes', () => {
                return db
                .into('folders')
                .insert(testFolders)
                .then(() => {
                  return db
                    .into('notes')
                    .insert(testNotes)
                })
            })

            it('GET /api/notes/:noteId responds with 200 and the specified note', () => {
            const noteId = 2
            const expectedNote = testNotes[noteId - 1]
            return supertest(app)
                .get(`/api/notes/${noteId}`)
                .expect(200, expectedNote) 
                })
            })

        context(`Given an XSS attack note`, () => {
            const testFolders = makeFoldersArray()     

            const maliciousNote = 
                {
                    "id": "911",
                    "name": "Naughty naughty very naughty <script>alert('xss');</script>",
                    "modified": "2018-08-20T23:00:00.000Z",
                    "content": 'Bad image <img src="https://url.to.file.which/does-not.exist" onerror="alert(document.cookie);">. But not <strong>all</strong> bad.',
                    "folderid": "1"
                }

            const expectedNote = 
              
                {
                    "id": "911",
                    "name": "Naughty naughty very naughty &lt;script&gt;alert('xss');&lt;/script&gt;",
                    "modified": "2018-08-20T23:00:00.000Z",
                    "content": 'Bad image <img src="https://url.to.file.which/does-not.exist">. But not <strong>all</strong> bad.',
                    "folderid": "1"
                }  
             
      
            beforeEach('insert malicious note', () => {
                return db
                .into('folders')
                .insert(testFolders)
                .then(() => {
                    return db
                      .into('notes')
                      .insert(maliciousNote)
                })
            })

            it('removes XSS attack content', () => {
              return supertest(app)
                .get('/api/notes/911')
                .expect(200)
                .expect(res => {
                    expect(res.body.name).to.equal(expectedNote.name)
                    expect(res.body.content).to.equal(expectedNote.content)
                })
            })
        })    
    })

    describe(`POST /api/notes/add-note`, () => {

        const testFolders = makeFoldersArray();
        beforeEach('insert malicious article', () => {
          return db
            .into('folders')
            .insert(testFolders)
        })
           
        it(`creates a note, responding with 201 and the new note`, function() {     
            this.retries(3)
            const newNote = {
                "name": "Test",
                "content": "The contents of newNote",
                "folderid": "1"
            }
            return supertest(app)
            .post('/api/notes/add-note')
            .send(newNote)
            .expect(201)
            .expect(res => {
                expect(res.body.name).to.equal(newNote.name)
                expect(res.body.content).to.equal(newNote.content)
                expect(res.body).to.have.property('id')
                expect(res.body).to.have.property('modified')
                expect(res.body).to.have.property('folderid')
                expect(res.headers.location).to.equal(`/api/notes/add-note/${res.body.id}`)
            })
            .then(postRes =>
                supertest(app)
                .get(`/api/notes/${postRes.body.id}`)
                .expect(postRes.body)
            )
        })

        const requiredFields = [ "name", "content", "folderid" ]

        requiredFields.forEach(field => {
            const newNote = {
                "name": "Test new note",
                "content": "The contents of newNote",
                "folderid": "1"
            }

            it(`responds with 400 and an error message when the '${field}' is missing`, () => {
                delete newNote[field]

                return supertest(app)
                .post('/api/notes/add-note')
                .send(newNote)
                .expect(400, {
                    error: { message: `Missing '${field}' in request body` }
                })
            })
        })

            it('removes XSS attack content from response', () => {
  
                const maliciousNote = {
                    "name": "Naughty naughty very naughty <script>alert('xss');</script>",
                    "content": "Bad image <img src='https://url.to.file.which/does-not.exist' onerror='alert(document.cookie);'>. But not <strong>all</strong> bad.",
                    "folderid": "1"
                }
                    
                const expectedNote = 
            
                {
                    "id": "911",
                    "name": "Naughty naughty very naughty &lt;script&gt;alert('xss');&lt;/script&gt;",
                    "modified": "2018-08-20T23:00:00.000Z",
                    "content": 'Bad image <img src="https://url.to.file.which/does-not.exist">. But not <strong>all</strong> bad.',
                    "folderid": "1"
                }  
         
                return supertest(app)
                .post(`/api/notes/add-note`)
                .send(maliciousNote)
                .expect(201)
                .expect(res => {
                  expect(res.body.name).to.equal(expectedNote.name)
                  expect(res.body.content).to.equal(expectedNote.content)
                })
            })
        

        

    })

    describe(`DELETE /api/notes/:noteid`, () => {
       context(`Given no notes`, () => {
            it(`responds with 404`, () => {
            const noteid = 123456
            return supertest(app)
                .delete(`/api/notes/${noteid}`)
                .expect(404, { error: { message: `Note doesn't exist` } })
            })
           
        })
        
        
        context('Given there are notes in the database', () => {
            const testNotes = makeNotesArray()
            const testFolders = makeFoldersArray()
        
            beforeEach('insert folders', () => {
                return db
                .into('folders')
                .insert(testFolders)
                .then(() => {
                  return db
                    .into('notes')
                    .insert(testNotes)
                })
            })
        
            it('responds with 204 and removes the note', () => {
                const idToRemove = 2
                const expectedNotes = testNotes.filter(note => note.id != idToRemove)
                return supertest(app)
                  .delete(`/api/notes/${idToRemove}`)
                  .expect(204)
                  // eslint-disable-next-line no-unused-vars
                  .then(res =>
                    supertest(app)
                      .get(`/api/notes`)
                      .expect(expectedNotes)
              )
          })
        })
    })
    
})


