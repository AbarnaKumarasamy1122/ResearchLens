export class OpenAlexError extends Error {
  statusCode: number;
  responseBody?: unknown;

  constructor(
    message: string,
    statusCode: number,
    responseBody?: unknown
  ) {
    super(message);

    this.name = "OpenAlexError";
    this.statusCode = statusCode;
    this.responseBody = responseBody;
  }
}

export class OpenAlexConfigurationError extends Error {
  constructor(message: string) {
    super(message);

    this.name = "OpenAlexConfigurationError";
  }
}

export class OpenAlexTimeoutError extends Error {
  constructor(message = "OpenAlex request timed out") {
    super(message);

    this.name = "OpenAlexTimeoutError";
  }
}