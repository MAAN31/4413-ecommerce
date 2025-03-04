
let { describe, it, expect } = global;

import request from 'supertest';

import app from '../../app';
import * as db from '../../config/testing/testDb';
import { signToken } from '../../auth/auth.service';

import User from '../user/user.model';
import UserFactory from '../user/user.factory';

import Vehicle from '../vehicle/vehicle.model';
import VehicleFactory from '../vehicle/vehicle.factory';

import Order from './order.model';
import OrderFactory from './order.factory';

describe('GET /api/orders', function() {
  let user;
  let user2;
  let vehicle;
  let vehicle2;
  
  beforeAll(async () => {
    await db.connect();
    await db.clearDatabase();
  });
  beforeEach(async () => {
    user = await User.create(UserFactory.build());
    user2 = await User.create(UserFactory.build());
    vehicle = await Vehicle.create(VehicleFactory.build());
    vehicle2 = await Vehicle.create(VehicleFactory.build());
  });
  afterEach(async () => {
      await db.clearDatabase();
  });
  afterAll(async () => {
      await db.closeDatabase();
  });

  // test cases

  it('should respond with JSON array', async () => {
    const res = await request(app).get('/api/orders/');
    expect(res.statusCode).toBe(200);
    expect(res.type).toBe('application/json');
    expect(res.body.orders).toBeInstanceOf(Array);
    expect(res.body.orders.length).toBe(0);
  });

  it('should respond with all orders', async () => {
    let order = OrderFactory.build({
      user: user._id,
      vehicles: [ vehicle._id ]
    });
    await Order.create(order);

    const res = await request(app).get('/api/orders/');
    expect(res.statusCode).toBe(200);
    expect(res.type).toBe('application/json');
    expect(res.body.orders).toBeInstanceOf(Array);
    expect(res.body.orders.length).toBe(1);
  });

  // add filter by user
  it('should respond with orders for specific vehicle', async () => {
    let order = OrderFactory.build({
      user: user._id,
      vehicles: [ vehicle._id ]
    });
    let order2 = OrderFactory.build({
      user: user2._id,
      vehicles: [ vehicle._id ]
    });

    await Order.create(order);
    await Order.create(order2);

    const res = await request(app).get(`/api/orders/?user=${user._id}`);
    expect(res.statusCode).toBe(200);
    expect(res.type).toBe('application/json');
    expect(res.body.orders).toBeInstanceOf(Array);
    expect(res.body.orders.length).toBe(1);
  });
});


describe('GET /api/orders/:id', function() {
  let user;
  let vehicle;
  
  beforeAll(async () => {
    await db.connect();
    await db.clearDatabase();
  });
  beforeEach(async () => {
    user = await User.create(UserFactory.build());
    vehicle = await Vehicle.create(VehicleFactory.build());
  });
  afterEach(async () => {
    await db.clearDatabase();
  });
  afterAll(async () => {
    await db.closeDatabase();
  });

  // test cases

  it('should respond with specific order', async () => {
    let order = OrderFactory.build({
      user: user._id,
      vehicles: [ vehicle._id ]
    });

    order = await Order.create(order);

    const res = await request(app).get(`/api/orders/${order._id}`);
    expect(res.statusCode).toBe(200);
    expect(res.type).toBe('application/json');
    expect(res.body.order._id).toBe(order._id.toString());
  });
});


describe('POST /api/orders', function() {
  let user;
  let vehicle;
  let userToken;

  beforeAll(async () => {
    await db.connect();
    await db.clearDatabase();
  });
  beforeEach(async () => {
    user = await User.create(UserFactory.build());
    vehicle = await Vehicle.create(VehicleFactory.build());
    userToken = signToken(user._id);
  });
  afterEach(async () => {
      await db.clearDatabase();
  });
  afterAll(async () => {
      await db.closeDatabase()
  });

  it('should respond with 201 if successful', async () => {
    let count = await Order.count({});
    const res = await request(app).post('/api/orders/')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        price: 10000, 
        deliveryDate: Date.now(), 
        deliveryAddress: "asdasdasd",
        paymentToken: "dfgdfgdfg",
        user: user._id,
        vehicles: [ vehicle._id ]
      });
    expect(res.type).toBe('application/json');
    expect(res.status).toBe(201);
    let newCount = await Order.count({});
    expect(newCount).toBe(count + 1);
  });

  it('should respond with 401 if not logged in', async () => {
    const res = await request(app).post('/api/orders/')
      .send({
        price: 10000, 
        deliveryDate: Date.now(), 
        deliveryAddress: "asdasdasd",
        paymentToken: "dfgdfgdfg",
        user: user._id,
        vehicles: [ vehicle._id ]
      });
  
    expect(res.status).toBe(401);
  });

  it('should respond with 404 if mandatory field is missing', async () => {
    let count = await Order.count({});
    const res = await request(app).post('/api/orders/')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        deliveryDate: Date.now(), 
        deliveryAddress: "asdasdasd",
        paymentToken: "dfgdfgdfg",
        user: user._id,
        vehicles: [ vehicle._id ]
      });
  
    expect(res.status).toBe(404);
    let newCount = await Order.count({});
    expect(newCount).toBe(count);
  });

  it('should respond with 404 validation error if userId does not exist', async () => {
    let count = await Order.count({});
    const res = await request(app).post('/api/orders/')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        price: 10000, 
        deliveryDate: Date.now(), 
        deliveryAddress: "asdasdasd",
        paymentToken: "dfgdfgdfg",
        vehicles: [ vehicle._id ]
      });
  
    expect(res.status).toBe(404);
    let newCount = await Order.count({});
    expect(newCount).toBe(count);
  });

});



describe('DELETE /api/orders/:id', function() {
  let user;
  let vehicle;
  let userToken;

  beforeAll(async () => {
    await db.connect();
    await db.clearDatabase();
  });
  beforeEach(async () => {
    user = await User.create(UserFactory.build());
    vehicle = await Vehicle.create(VehicleFactory.build());
    userToken = signToken(user._id);
  });
  afterEach(async () => {
    await db.clearDatabase();
  });
  afterAll(async () => {
    await db.closeDatabase();
  });

  // test cases

  it('should respond with 204', async () => {
    let order = OrderFactory.build({
      user: user._id,
      vehicles: [ vehicle._id ]
    });

    order = await Order.create(order);

    let count = await Order.count({});

    const res = await request(app)
                        .delete(`/api/orders/${order._id}`)
                        .set('Authorization', `Bearer ${userToken}`);

    expect(res.statusCode).toBe(204);

    let newCount = await Order.count({});
    expect(newCount).toBe(count - 1);
  });
});
