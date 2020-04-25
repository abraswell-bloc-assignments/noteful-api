const xss = require('xss')


function makeNotesArray() {
    return [
        {
            "id": "1",
            "name": "Fixture-Note-1",
            "modified": "2019-01-03T00:00:00.000Z",
            "folderid": "1",
            "content": "Corporis accusamus placeat quas non voluptas."
        },
        {
            "id": "2",
            "name": "Fixture-Note-2",
            "modified": "2018-08-15T23:00:00.000Z",
            "folderid": "2",
            "content": "Eos laudantium quia ab blanditiis temporibus necessitatibus."
        },
        {
            "id": "3",
            "name": "Fixture-Note-3",
            "modified": "2018-03-01T00:00:00.000Z",
            "folderid": "3",
            "content": "Occaecati dignissimos quam qui facere deserunt quia."
        },
        {
            "id": "4",
            "name": "Fixture-Note-4",
            "modified": "2019-01-04T00:00:00.000Z",
            "folderid": "1",
            "content": "Eum culpa odit. Veniam porro molestiae dolores sunt reiciendis culpa."
        },
        {
            "id": "5",
            "name": "Fixture-Note-5",
            "modified": "2018-07-12T23:00:00.000Z",
            "folderid": "2",
            "content": "Distinctio dolor nihil ad iure quo tempore id ipsum. Doloremque sunt dicta odit."
        },
        {
            "id": "6",
            "name": "Fixture-Note-6",
            "modified": "2018-08-20T23:00:00.000Z",
            "folderid": "3",
            "content": "Aliquid magnam ut quis quas impedit molestiae laudantium adipisci et."
        }
    ]    
  }

  function makeMaliciousNote() {

    const serializeNote = (maliciousNote) => ({
      id: maliciousNote.id.toString(),
      name: xss(maliciousNote.name),
      modified: maliciousNote.modified,
      content: xss(maliciousNote.content),
      folderid: maliciousNote.folderid.toString(),
      })    

    const maliciousNote = {
      "id": "911",
      "name": 'Naughty naughty very naughty <script>alert("xss");</script>',
      "modified": "2018-08-20T23:00:00.000Z",
      "content": `Fixture Bad image <img src="https://url.to.file.which/does-not.exist" onerror="alert(document.cookie);">. But not <strong>all</strong> bad.`,
      "folderid": "1"
    }
    const expectedNote = {
      "id": "912",
      "name": 'Naughty naughty very naughty <script>alert("xss");</script>',
      "modified": "2018-08-20T23:00:00.000Z",
      "content": `Fixture Bad image <img src="https://url.to.file.which/does-not.exist">. But not <strong>all</strong> bad.`,
      "folderid": "1"
    }

    return (
     serializeNote(maliciousNote),
     expectedNote
    )

  }

  module.exports = { 
      makeNotesArray,
      makeMaliciousNote,
 }