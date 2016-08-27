import './css/main.sass';
import Boot from 'states/Boot';
import Manager from 'app/Manager';

Manager.game.state.add('Boot', new Boot());
Manager.game.state.start('Boot');