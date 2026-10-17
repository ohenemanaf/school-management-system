const secret = process.env.JWT_SECRET;
if (!secret || secret.length < 32 || /replace-with|please.change|supersecret/i.test(secret)) {
    throw new Error('Set JWT_SECRET to a unique random secret of at least 32 characters before starting the backend.');
}
module.exports = { secret };
