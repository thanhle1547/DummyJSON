const errorMiddleware = (err, req, res, next) => {
  if (!err) {
    next();
    return;
  }

  if (err.status === 404) {
    console.log('*** 404 Error ***', err.message || err);
  } else {
    console.log('*-*-* [start] error *-*-*');
    console.log(err);
    console.log('*-*-* [end] error *-*-*');
  }

  const message = err.message;

  if (message === 'jwt expired') {
    return res.status(401).send({ ...err, message: 'Token Expired!' });
  }

  if (message === 'jwt malformed') {
    return res.status(401).send({ ...err, message: 'Invalid/Expired Token!' });
  }

  const invalidIdTokenText = 'Firebase ID token has no "kid" claim';

  if (message === 'Invalid Token' || message.startsWith(invalidIdTokenText)) {
    return res.status(401).send({ ...err, message: 'Invalid Token!' });
  }

  const rawResponseText = 'Raw server response: ';
  const rawResponseIndex = message.indexOf(rawResponseText);
  if (rawResponseIndex !== -1) {
    const rawResponse = message.substring(rawResponseIndex + rawResponseText.length + 1, message.length - 1);
    const response = JSON.parse(rawResponse);

    return res.status(response.error.code || 500).send({ message: response.error.message });
  }

  const wrongFirebaseText = 'Firebase ID token has incorrect "aud" (audience) claim. Expected';
  if (message.startsWith(wrongFirebaseText)) {
    return res.status(500).send({ message: 'Wrong Firebase' });
  }

  const details = err.details;
  const cloudFirestoreDisabledText = 'Cloud Firestore API has not been used in project ';
  if (details !== undefined && details.startsWith(cloudFirestoreDisabledText)) {
    return res.status(500).send({ message: 'Cloud Firestore has not been used or it is disabled' });
  }

  const error = {
    message: message,
  };

  res.status(err.status || 500);

  if (!error.message) {
    error.message = `Something went wrong.`;
  }

  res.json(error);
};

module.exports = errorMiddleware;
