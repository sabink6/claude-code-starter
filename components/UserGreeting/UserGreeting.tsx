import styles from "./UserGreeting.module.css"

type UserGreetingProps = {
  codename: string
}

export default function UserGreeting({ codename }: UserGreetingProps) {
  return <p className={styles.greeting}>Hello, {codename}</p>
}
