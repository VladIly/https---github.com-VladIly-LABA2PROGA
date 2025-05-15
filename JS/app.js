const express = require('express');
const path = require('path');
const db = require('./db');
const app = express();
const PORT = 3000;

app.use(express.json());

// Статичні файли (CSS, HTML)
app.use('/style', express.static(path.join(__dirname, '..', 'style')));
app.use(express.static(path.join(__dirname, '..', 'views')));

// Головна сторінка
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'views', 'index.html'));
});

// Сторінка замовлень
app.get('/orders-page', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'views', 'orders.html'));
});

// Сторінка піц
app.get('/pizzas-page', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'views', 'pizzas.html'));
});

// === API ===

// Отримати всіх клієнтів
app.get('/customers', async (req, res) => {
  try {
    const result = await db.pool.query('SELECT * FROM customers');
    res.json(result.rows);
  } catch (err) {
    console.error('DB error:', err);
    res.status(500).send('Помилка в опрацюванні запиту');
  }
});

// Отримати всі замовлення з піцами
app.get('/orders', async (req, res) => {
  try {
    const orders = await db.getOrders();
    res.json(orders);
  } catch (err) {
    console.error('DB error:', err);
    res.status(500).send('Помилка в опрацюванні запиту');
  }
});

// Створити нове замовлення
app.post('/orders', async (req, res) => {
  try {
    const { customer_id } = req.body;
    if (!customer_id) {
      return res.status(400).send('Не вказано ID клієнта');
    }
    const newOrder = await db.createOrder(customer_id);
    res.status(201).json(newOrder);
  } catch (err) {
    console.error('DB error:', err);
    res.status(500).send('Помилка в опрацюванні запиту');
  }
});

// Оновити статус замовлення
app.put('/orders/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    if (!status) {
      return res.status(400).send('Не вказано статус');
    }
    const result = await db.pool.query(
      'UPDATE orders SET status = $1 WHERE id = $2 RETURNING *',
      [status, id]
    );
    if (result.rows.length === 0) {
      return res.status(404).send('Замовлення не знайдено');
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('DB error:', err);
    res.status(500).send('Помилка в опрацюванні запиту');
  }
});

// Видалити замовлення
app.delete('/orders/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await db.pool.query('DELETE FROM order_pizzas WHERE order_id = $1', [id]);
    await db.pool.query('DELETE FROM orders WHERE id = $1', [id]);
    res.sendStatus(204);
  } catch (err) {
    console.error('DB error:', err);
    res.status(500).send('Помилка в опрацюванні запиту');
  }
});

// Додати піцу до замовлення
app.post('/orders/:orderId/pizzas', async (req, res) => {
  try {
    const orderId = parseInt(req.params.orderId);
    const { pizza_id } = req.body;
    if (!pizza_id || isNaN(orderId)) {
      return res.status(400).send('Неправильні дані');
    }
    await db.addPizzaToOrder(orderId, pizza_id);
    res.status(201).send('Піцу додано до замовлення');
  } catch (err) {
    console.error('DB error:', err);
    res.status(500).send('Помилка в опрацюванні запиту');
  }
});

// Отримати всі піци
app.get('/pizzas', async (req, res) => {
  try {
    const result = await db.pool.query('SELECT * FROM pizzas');
    res.json(result.rows);
  } catch (err) {
    console.error('DB error:', err);
    res.status(500).send('Помилка в опрацюванні запиту');
  }
});

// Створити нову піцу
app.post('/pizzas', async (req, res) => {
  try {
    const { name, description, price } = req.body;
    if (!name || !description || price == null) {
      return res.status(400).send('Усі поля піци обовʼязкові');
    }
    const result = await db.pool.query(
      'INSERT INTO pizzas (name, description, price) VALUES ($1, $2, $3) RETURNING *',
      [name, description, price]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('DB error:', err);
    res.status(500).send('Помилка в опрацюванні запиту');
  }
});

// Оновити піцу
app.put('/pizzas/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, price } = req.body;
    if (!name || !description || price == null) {
      return res.status(400).send('Усі поля обовʼязкові');
    }
    const result = await db.pool.query(
      'UPDATE pizzas SET name = $1, description = $2, price = $3 WHERE id = $4 RETURNING *',
      [name, description, price, id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error('DB error:', err);
    res.status(500).send('Помилка в опрацюванні запиту');
  }
});

// Видалити піцу
app.delete('/pizzas/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await db.pool.query('DELETE FROM pizzas WHERE id = $1', [id]);
    res.sendStatus(204);
  } catch (err) {
    console.error('DB error:', err);
    res.status(500).send('Помилка в опрацюванні запиту');
  }
});


// Створити клієнта
app.post('/customers', async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).send('Ім’я обовʼязкове');

    const result = await db.pool.query(
      'INSERT INTO customers (name, phone) VALUES ($1, $2) RETURNING *',
      [name, '']
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('DB error:', err);
    res.status(500).send('Помилка створення клієнта');
  }
});



// Запуск сервера
app.listen(PORT, () => {
  console.log(`Сервер запущено на http://localhost:${PORT}`);
});
