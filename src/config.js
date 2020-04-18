// change database owner
const owner = 'postgres'

module.exports = {
    PORT: process.env.PORT || 8000,
    NODE_ENV: process.env.NODE_ENV || 'development',
    DB_URL: process.env.DB_URL || `postgresql://${ owner }@localhost/blogful`,
}