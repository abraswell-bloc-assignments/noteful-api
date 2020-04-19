
function makeFoldersArray() {
  return [
    {
      "id": 1,
      "name": "Important Fixture"
    },
    {
      "id": 2,
      "name": "Super Fixture"
    },
    {
      "id": 3,
      "name": "Spangley Fixture"
    }
  ]   
}
  
function makeMaliciousFolder() {
  const maliciousFolder = {
    id: 911,
    name: `Fixture Bad image <img src="https://url.to.file.which/does-not.exist" onerror="alert(document.cookie);">. But not <strong>all</strong> bad.`
  }
  const expectedFolder = {
    ...maliciousFolder,
    name: `Fixture Bad image <img src="https://url.to.file.which/does-not.exist">. But not <strong>all</strong> bad.`
  }
  return {
    maliciousFolder,
    expectedFolder,
  }
}
  
module.exports = {
  makeFoldersArray,
  makeMaliciousFolder,
}
  
  