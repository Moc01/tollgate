/** Base class for all Tollgate runtime errors. */
export class TollgateError extends Error {
  readonly code: string

  constructor(code: string, message: string) {
    super(message)
    this.name = this.constructor.name
    this.code = code
    // Restore prototype chain for older runtimes
    Object.setPrototypeOf(this, new.target.prototype)
  }
}

/** Thrown when a request lacks a valid access token and the caller must pay. */
export class PaymentRequiredError extends TollgateError {
  constructor(message = 'Payment required') {
    super('payment_required', message)
  }
}

/** Thrown when an intent body is malformed. */
export class InvalidIntentError extends TollgateError {
  constructor(message = 'Invalid intent') {
    super('invalid_intent', message)
  }
}

/** Thrown by agent SDK when a 402 price exceeds the configured budget. */
export class BudgetExceededError extends TollgateError {
  constructor(
    public readonly priceUsdc: number,
    public readonly limitUsdc: number,
    message?: string,
  ) {
    super(
      'budget_exceeded',
      message ??
        `Price ${priceUsdc} USDC exceeds configured limit ${limitUsdc} USDC`,
    )
  }
}

/** Thrown when an access token has expired. */
export class TokenExpiredError extends TollgateError {
  constructor(message = 'Access token expired') {
    super('token_expired', message)
  }
}

/** Thrown when a token signature is invalid (or JWKS unavailable). */
export class InvalidTokenError extends TollgateError {
  constructor(message = 'Invalid access token') {
    super('invalid_token', message)
  }
}

/** Thrown when on-chain payment doesn't match the intent. */
export class PaymentMismatchError extends TollgateError {
  constructor(message = 'Payment does not match intent') {
    super('payment_mismatch', message)
  }
}

/** Thrown when intent has expired before payment was observed. */
export class IntentExpiredError extends TollgateError {
  constructor(message = 'Intent expired') {
    super('intent_expired', message)
  }
}

/** Thrown when intent has already had a token issued for it. */
export class IntentConsumedError extends TollgateError {
  constructor(message = 'Intent already consumed') {
    super('intent_consumed', message)
  }
}

/** Thrown when a 402 body fails schema validation. */
export class Invalid402BodyError extends TollgateError {
  constructor(message = 'Invalid 402 response body') {
    super('invalid_402_body', message)
  }
}

/** Thrown when settlement service returns an unexpected status. */
export class SettlementError extends TollgateError {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super('settlement_error', message)
  }
}
