declare global {
  namespace NodeJS {
    interface ProcessEnv {
      SERVER_ID: string,
      AUTHOR_ID: string,
      CHANNEL1_ID: string,
      CHANNEL2_ID: string,
      TOKEN: string,
      DB_PASSWORD: string
    }
  }
}

export {}