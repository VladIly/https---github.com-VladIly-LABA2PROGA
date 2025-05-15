const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'pizzeria_db',
  password: 'Vladik1230',
  port: 5432,
});

/**
 * Отримати всі замовлення з клієнтами та піцами
 */
async function getOrders() {
  try {
    const ordersResult = await pool.query(`
      SELECT o.id, o.order_date, o.status, c.id AS customer_id, c.name AS customer_name
      FROM orders o
      JOIN customers c ON o.customer_id = c.id
      ORDER BY o.order_date DESC
    `);

    const orders = ordersResult.rows;

    // Отримати піци для кожного замовлення
    await Promise.all(orders.map(async (order) => {
      const pizzasResult = await pool.query(`
        SELECT p.id, p.name, p.description, p.price
        FROM order_pizzas op
        JOIN pizzas p ON op.pizza_id = p.id
        WHERE op.order_id = $1
      `, [order.id]);
      order.pizzas = pizzasResult.rows;
    }));

    return orders;
  } catch (error) {
    console.error('Помилка в getOrders:', error);
    throw error;
  }
}

/**
 * Створити нове замовлення для клієнта
 */
async function createOrder(customerId) {
  try {
    const result = await pool.query(`
      INSERT INTO orders (customer_id, status)
      VALUES ($1, 'Нове замовлення!') RETURNING *
    `, [customerId]);
    return result.rows[0];
  } catch (error) {
    console.error('Помилка в createOrder:', error);
    throw error;
  }
}

/**
 * Додати піцу до замовлення
 */
async function addPizzaToOrder(orderId, pizzaId) {
  try {
    await pool.query(`
      INSERT INTO order_pizzas (order_id, pizza_id)
      VALUES ($1, $2)
    `, [orderId, pizzaId]);
  } catch (error) {
    console.error('Помилка в addPizzaToOrder:', error);
    throw error;
  }
}

module.exports = {
  pool,
  getOrders,
  createOrder,
  addPizzaToOrder,
};
