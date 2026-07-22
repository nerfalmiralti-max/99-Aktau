export class BookingConflictError extends Error {
  constructor(message = "Не удалось создать бронирование для выбранного времени") {
    super(message);
    this.name = "BookingConflictError";
  }
}

export class ActiveBookingLimitError extends BookingConflictError {
  constructor() {
    super("На этот номер уже есть активная будущая заявка. Дождитесь её завершения или изменения статуса");
    this.name = "ActiveBookingLimitError";
  }
}

export class BookingIntervalConflictError extends BookingConflictError {
  constructor() {
    super("Это время уже занято. Выберите другой интервал или зал");
    this.name = "BookingIntervalConflictError";
  }
}

export class BookingValidationError extends Error {
  constructor(message = "Проверьте параметры бронирования") {
    super(message);
    this.name = "BookingValidationError";
  }
}

export class BookingStoreError extends Error {
  constructor(message = "Booking storage request failed") {
    super(message);
    this.name = "BookingStoreError";
  }
}
