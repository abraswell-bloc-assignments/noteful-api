/* eslint-disable no-undef */

// psql -U postgres -d noteful-test -f ./migrations/002.do.create_notes_table.sql

const knex = require('knex')
const app = require('../src/app')
const {makeFoldersArray} = require('./folders.fixtures')
const {makeMaliciousFolder} = require('./folders.fixtures')


describe('Folders Endpoints', function(){
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

    describe(`GET /api/folders`, ()=> {
        context(`Given no folders`, () => {
            it(`responds with 200 and an empty list`, () => {
                return supertest(app)
                    .get('/api/folders')
                    .expect(200, [])
            })
        })

        context('Given there are folders in the database', () => {
            const testFolders = makeFoldersArray()
    
            beforeEach('insert folders', () => {
                return db
                .into('folders')
                .insert(testFolders)
            })
    
            it('GET /api/folders responds with 200 and all of the folders', () => {
                return supertest(app)
                .get('/api/folders')
                .expect(200, testFolders)
            })
        })

        context(`Given an XSS attack folder`, () => {
            const testFolders = makeFoldersArray()
            const { maliciousFolder, expectedFolder } = makeMaliciousFolder()
      
            beforeEach('insert malicious folder', () => {
                return db
                .into('folders')
                .insert(testFolders)
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

    describe(`GET /api/folders/:folderid`, () => {
        context(`Given no folders`, () => {
            it(`responds with 404`, () => {
                const folderid = 123456
                return supertest(app)
                    .get(`/api/folders/${folderid}`)
                    .expect(404, {error: {message:`Folder doesn't exist`} })
            })
        })
        
        context('Given there are folders in the database', () => {
            const testFolders = makeFoldersArray()

            beforeEach('insert folders', () => {
                return db
                .into('folders')
                .insert(testFolders)
            })

            it('GET /api/folders/:folderid responds with 200 and the specified folder', () => {
            const folderid = 2
            const expectedFolder = testFolders[folderid - 1]
            return supertest(app)
                .get(`/api/folders/${folderid}`)
                .expect(200, expectedFolder) 
                })
            })

        context(`Given an XSS attack folder`, () => {
            const testFolders = makeFoldersArray()
            const { maliciousFolder, expectedFolder } = makeMaliciousFolder()
      
            beforeEach('insert malicious folder', () => {
                return db
                .into('folders')
                .insert(testFolders)
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
                  expect(res.body.name).to.eql(expectedFolder.name)
                  expect(res.body.content).to.eql(expectedFolder.content)
                })
            })
        })    
    })

    describe(`POST /api/folders`, () => {
           
        it(`creates a folder, responding with 201 and the new folder`, function() {
            this.retries(3)
            const newFolder = {
                "name": "New Folder"
            }
            return supertest(app)
            .post('/api/folders/add-folder')
            .send(newFolder)
            .expect(201)
            .expect(res => {
                expect(res.body.name).to.eql(newFolder.name)
                expect(res.body).to.have.property('id')
                expect(res.headers.location).to.eql(`/api/folders/add-folder/${res.body.id}`)
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
                .post('/api/folders/add-folder')
                .send(newFolder)
                .expect(400, {
                    error: { message: `Missing '${field}' in request body` }
                })
            })
        })
        
            it('removes XSS attack content from response', () => {
                const { maliciousFolder, expectedFolder } = makeMaliciousFolder()
                return supertest(app)
                .post(`/api/folders/add-folder`)
                .send(maliciousFolder)
                .expect(201)
                .expect(res => {
                    expect(res.body.title).to.eql(expectedFolder.title)
                    expect(res.body.content).to.eql(expectedFolder.content)
                })
            })
    })

    describe(`DELETE /api/folders/:folderid`, () => {
       context(`Given no folders`, () => {
            it(`responds with 404`, () => {
            const folderid = 123456
            return supertest(app)
                .delete(`/api/folders/${folderid}`)
                .expect(404, { error: { message: `Folder doesn't exist` } })
            })
        })
        
        
        context('Given there are folders in the database', () => {
            const testFolders = makeFoldersArray()
        
            beforeEach('insert folders', () => {
                return db
                .into('folders')
                .insert(testFolders)
            })
        
            it('responds with 204 and removes the post', () => {
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

    describe(`PATCH /api/folders/:folderid`, () => {
        context(`Given no folders`, () => {
            it(`responds with 404`, () => {
                const folderid = 123456
                return supertest(app)
                    .patch(`/api/folders/${folderid}`)
                    .expect(404, { error: { message: `Folder doesn't exist`}})
            })
        })

        context('Given there are folders in the database', () => {
            const testFolders = makeFoldersArray()

            beforeEach('insert folders', () => {
                return db
                .into('folders')
                .insert(testFolders)
            })


            it('responds with 204 and updates the folder', () => {
                const idToUpdate = 2
                const updateFolder = {
                    name: 'Test new folder'    
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
                            message: `Request body must contain 'name'` 
                        }
                })
            })

        })

    })
})


