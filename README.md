[![Uptime Robot status](https://img.shields.io/uptimerobot/status/m793802954-7f701e85a9b8891f77662c72?label=json-server&style=for-the-badge&)](https://dummyjson.com/test)

# DummyJSON - Generate Placeholder Data on the Fly!

[DummyJSON](https://dummyjson.com) is your go-to free online REST API for instantly generating placeholder data without the hassle of setting up a server. Perfect for front-end development, teaching, testing, and prototyping!

Explore the detailed documentation at [DummyJSON/Docs](https://dummyjson.com/docs/) for quick samples.

**New**: Now you can generate your own [custom responses](https://dummyjson.com/custom-response) from DummyJSON, [try it now!](https://dummyjson.com/custom-response)

## Why DummyJSON?

Ever felt bogged down by the complexities of setting up a backend just to fetch dummy data for your front-end project? Or perhaps you dreamt of a learning app where obtaining realistic data didn't involve navigating through convoluted public APIs and cumbersome registration processes. Well, say hello to DummyJSON!

Say goodbye to wrestling with complicated backend setups! With DummyJSON, you can focus on your work without the hassle of intricate configurations. The straightforward backend server effortlessly meets your data needs, saving you from dealing with complex public APIs. No more complicated setups – just a smooth experience to speed up your development process.

Give it a spin at [DummyJSON](https://dummyjson.com) and make your development process smoother.

## Features that Enhance Your Experience

- **No Sign-up/Registration**: Dive in and start using it hassle-free.
- **Zero-configuration**: Enjoy a seamless experience without the need for setup.
- **Basic and Advanced API**: Covering everything from simple to sophisticated data.
- **Custom Responses**: Create your own custom responses using DummyJSON custom response generator.
- **Resource Relationships**: Effortlessly understand and model data relationships.
- **Filters and Nested Resources**: Tailor your data to fit your needs perfectly.
- **HTTP Methods Support**: We've got all your HTTP methods covered - GET, POST, PUT, PATCH, and DELETE.
- **Delay Responses**: Simulate real-world conditions with adjustable response delays.
- **Cross-framework Compatibility**: Seamlessly integrate with React, Angular, Vue, Ember, or vanilla JavaScript.

## Available Resources

Over **10** resources ready for use:

- [190+ Products](https://dummyjson.com/products)
- [50 Carts](https://dummyjson.com/carts)
- [200+ Users](https://dummyjson.com/users)
- [250+ Posts](https://dummyjson.com/posts)
- [340 Comments](https://dummyjson.com/comments)
- [1400+ Quotes](https://dummyjson.com/quotes)
- [50 Recipes](https://dummyjson.com/recipes)
- [250+ Todos](https://dummyjson.com/todos)
- [Authentication/Authorization](https://dummyjson.com/auth)
- [Custom HTTP Response](https://dummyjson.com/docs/http)

## How to Fetch Data

Use any method you prefer - fetch API, Axios, jQuery AJAX - it all works seamlessly.

### Example: Get all products

```js
fetch('https://dummyjson.com/products')
  .then(res => res.json())
  .then(json => console.log(json));
```

OR

```js
const res = await fetch('https://dummyjson.com/products');
const json = await res.json();
console.log(json);
```

Note: Pagination is also supported.

Explore all the routes and more at [DummyJSON/Docs](https://dummyjson.com/docs/).

## License

This project is open-source and available under the [MIT License](LICENSE).

## How to maintain

### Environment

* Install `env-cmd` globally to executing commands using an environment from an env file.

```
npm install -g env-cmd
```

* Install `nodemon` globally to monitor for any changes in the source and automatically restart the server.

```
npm install -g nodemon
```
