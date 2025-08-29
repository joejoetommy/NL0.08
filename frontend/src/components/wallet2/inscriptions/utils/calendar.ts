export interface CalendarEvent {
    start: Date
    end: Date
    type: 'booked' | 'multiday' | 'unavailable'
  }
  
  export interface CalendarData {
    [key: string]: CalendarEvent[]
  }