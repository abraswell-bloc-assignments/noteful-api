// Change table Name to current project's table
const table_name = 'name-of-project-table'

const ArticlesService = {

    getAllArticles(knex) {
      return knex.select('*').from(`${table_name}`)
    },
    insertArticle(knex, newArticle) {
      return knex
        .insert(newArticle)
        .into(`${table_name}`)
        .returning('*')
        .then(rows => {
          return rows[0]
        })
    },
    getById(knex, id) {
      return knex.from(`${table_name}`).select('*').where('id', id).first()
    },
    deleteArticle(knex, id) {
      return knex(`${table_name}`)
        .where({ id })
        .delete()
    },
    updateArticle(knex, id, newArticleFields) {
      return knex(`${table_name}`)
        .where({ id })
        .update(newArticleFields)
    },
  }
  
  module.exports = ArticlesService