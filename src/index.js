const { request, response } = require("express");
const express = require("express");
// v4 generates random numbers
const { v4: uuidv4 } = require("uuid");

const app = express();

app.use(express.json());

// improvised "database" bellow
const customers = [];

// Middleware
function verifyIfCPFAccountExists(request, response, next) {
  const { cpf } = request.headers;

  const customer = customers.find((customer) => customer.cpf === cpf);
  if (!customer) {
    return response.status(400).json({ error: "Customer not found." });
  }

  request.customer = customer;

  return next();
}

function getBalance(statement) {
  const balance = statement.reduce((accumulator, operation) => {
    if (operation.type === "credit") {
      return accumulator + operation.amount;
    } else {
      return accumulator - operation.amount;
    }
  }, 0); // value that the accumulator starts with

  return balance;
}

app.post("/account", (request, response) => {
  const { cpf, name } = request.body;

  // returns true if there's already a customer with the same CPF
  const customerAlreadyExists = customers.some(
    (customer) => customer.cpf === cpf
  );

  if (customerAlreadyExists) {
    return response.status(400).json({ error: "Customer already exists." });
  }

  customers.push({
    cpf,
    name,
    id: uuidv4(), // assigns the function to the ID
    statement: [],
  });

  return response.status(201).send();
});

// all routes bellow this will have to pass middleware first
// app.use(verifyIfCPFAccountExists);

app.get("/statement", verifyIfCPFAccountExists, (request, response) => {
  const { customer } = request; // retrieving customer from middleware

  return response.json(customer.statement);
});

app.post("/deposit", verifyIfCPFAccountExists, (request, response) => {
  const { description, amount } = request.body;

  const { customer } = request;

  const statementOperation = {
    description,
    amount,
    created_at: new Date(),
    type: "credit",
  };

  customer.statement.push(statementOperation);

  return response.status(201).send();
});

app.post("/withdraw", verifyIfCPFAccountExists, (request, response) => {
  const { amount } = request.body;
  const { customer } = request;

  const balance = getBalance(customer.statement);

  if (balance < amount) {
    return response.status(400).json({ error: "Insufficient funds!" });
  }

  const statementOperation = {
    amount,
    created_at: new Date(),
    type: "debit",
  };

  customer.statement.push(statementOperation);

  return response.status(201).send();
});

// localhost:3333
app.listen(3333);
