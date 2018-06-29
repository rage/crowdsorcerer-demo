import TmcClient from 'tmc-client-js';
import * as store from 'store';

import initQuiznator from './quiznator';
import initStudentDashboard from './student-dashboard';
import pheromones from './pheromones';
import jsLogger from './js-logger';
import nickGenerator from './nick-generator';

const client = new TmcClient();

class LoginModal {
  mount() {
    this.loginErrorNode = $('#tmc-login-error');
    this.loginFormNode = $('#tmc-login-form');
    this.loginModalToggleNode = $('#tmc-login-toggle');
    this.loginModalNode = $('#tmc-login-modal');
    this.loginUsernameNode = $('#tmc-login-username');
    this.loginPasswordNode = $('#tmc-login-password');

    if(!client.getUser()) {
      // this.loginModalNode.modal('show');
      this.generateRandomUsername();
    }
    this.afterLogin();
    this.updateLoginButtonText();

    this.loginModalToggleNode.on('click', this.onToggleLoginModal.bind(this));
    this.loginFormNode.on('submit', this.onSubmitLoginForm.bind(this));
  }

  afterLogin() {
    initQuiznator();
    initStudentDashboard();

    const researchAgreement = localStorage.getItem('research-agreement') || window['research-agreement'] || ""
    const agreed = researchAgreement.indexOf('j71pjik42i') !== -1
    window['research-agreement-agreed'] = agreed

    window.initCodeStatesVisualizer();
    window.initTyponator();
    window.initCrowdsorcerer();

    if (!agreed) {
      return;
    }

    this.initPheromones();

    this.initLogger();

    //this.getUserGroup();
  }

  getUserGroup() {
    const user = client.getUser();

    fetch(`https://ab-studio.testmycode.io/api/v0/ab_studies/typonator_s17_ohpe/group?oauth_token=${user.accessToken}`).then(function(response) {
      return response.json();
    }).then(function(data) {
      if(parseInt(data.group) == 1) {
        // no ab testing at the moment window.initTyponator();
      }
    });
  }

  initPheromones(){
    const { username } = client.getUser();


    pheromones.init({
      apiUrl: 'https://data.pheromones.io/',
      username,
      submitAfter: 20
    });
  }

  initLogger() {
    const { username } = client.getUser();

    jsLogger.setUser(username);
    jsLogger.setApiUrl('https://data.pheromones.io/');
    jsLogger.init();
  }

  getLoginText() {
    return 'Log in';
  }

  getLogOutText({ username }) {
    return `Log out ${username}`;
  }

  showError(message) {
    this.loginErrorNode.text(message);
    this.loginErrorNode.show();
  }

  hideError() {
    this.loginErrorNode.hide();
  }

  updateLoginButtonText() {
    if(client.getUser()) {
      this.loginModalToggleNode.text(this.getLogOutText({ username: client.getUser().username }));
    } else {
      this.loginModalToggleNode.text(this.getLoginText());
    }
  }

  generateRandomUsername() {
    const nick = nickGenerator();
    window.localStorage.setItem('tmc.user', `{"username":"${nick}", "accessToken":"kissa"}`);
  }

  onToggleLoginModal(e) {
    e.preventDefault();

    if(client.getUser()) {
      client.unauthenticate();

      try {
        localStorage.removeItem('research-agreement')
        window.StudentDashboard.destroy();
        window.Quiznator.removeUser();
        window.localStorage.removeItem('tmc.user');
      } catch(e) {}
    } else {
      this.generateRandomUsername();
      this.afterLogin();
    }

    this.updateLoginButtonText();
  }

  onSubmitLoginForm(e) {
    e.preventDefault();

    this.hideError();

    const username = this.loginUsernameNode.val();
    const password = this.loginPasswordNode.val();
    // const courseNode = this.loginFormNode.find('input[name="tmcLoginCourse"]:checked');

    // if(courseNode.length === 0) {
    //   this.showError('Et valinnut kurssia');
    // } else 
    if(!username || !password) {
      this.showError('Käyttäjätunnus tai salasana puuttuu');
    } else {
      // const course = courseNode.val();

      store.set('tmc.course', 'hy-ohpe-k18');

      client.authenticate({ username: username, password: password })
        .then(response => {
          this.loginModalNode.modal('hide');
          this.loginUsernameNode.val('');
          this.loginPasswordNode.val('');

          this.updateLoginButtonText();
          this.afterLogin();
        })
        .catch(() => {
          if(username.indexOf('@') > 0) {
            this.showError('Käyttäjätunnus tai salasana on virheellinen. Huomaathan, että sinun tulee kirjautua sisään käyttäjätunnuksellasi, eikä sähköpostiosoitteellasi')
          } else {
            this.showError('Käyttäjätunnus tai salasana on virheellinen');
          }
        });
    }
  }
}

export default LoginModal;
