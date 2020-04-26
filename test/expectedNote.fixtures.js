
function makeExpectedNote() {
    return [  
        {
            "id": "911",
            "name": "Naughty naughty very naughty &lt;script&gt;alert('xss');&lt;/script&gt;",
            "content": "Bad image <img src='https://url.to.file.which/does-not.exist'>. But not <strong>all</strong> bad.",
            "folderid": "1"
        }  
    ]        
}


module.exports = { 
    makeExpectedNote,
}