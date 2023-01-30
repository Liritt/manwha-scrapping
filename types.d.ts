declare global {
  namespace NodeJS {
    interface ProcessEnv {
      AUTHOR_ID: string,
      CHANNEL_ID: string,
      TOKEN: string
    }
  }
}

export {}