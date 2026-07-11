export class BookingConflictError extends Error {
  constructor() {
    super("Для одного номера телефона доступно не более двух активных бронирований");
    this.name = "BookingConflictError";
  }
}

export class BookingStoreError extends Error {
  constructor(message = "Booking storage request failed") {
    super(message);
    this.name = "BookingStoreError";
  }
}
