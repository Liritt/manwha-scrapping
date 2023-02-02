declare global {
  namespace NodeJS {
    interface ProcessEnv {
      SERVER_ID: string,
      AUTHOR_ID: string,
      CHANNEL_ID: string,
      CHANNEL_ID2: string,
      TOKEN: string,
      DB_PASSWORD: string
    }
  }
}

export {}