import { h, Component } from 'preact';
import { route } from 'preact-router';

import styles from './Main.css';
import { Button } from '../../components';

class Main extends Component {
  changeRoute(url) {
    route(url);
  }

  render() {
    return (
      <div class={styles.mainPage}>
        <span style={{ height: 50 }} />
        <section class={styles.mainPage__topSection}>
          <h1 class={styles.mainPage__topSection_title}>
            ورد<span>ر</span>یس
          </h1>
          <Button
            type="linear"
            color="primary"
            onClick={() => {
              this.changeRoute('/game');
            }}
          >
            بزن بریم
          </Button>
        </section>
        <nav class={styles.mainPage__botomNav}>
          <Button type="icony" icon="a-sound" />
          <Button
            type="icony"
            icon="a-stats"
            onClick={() => {
              this.changeRoute('scores');
            }}
          />
          <Button type="icony" icon="a-share" />
        </nav>
      </div>
    );
  }
}

export default Main;