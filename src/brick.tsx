import React, { Component } from 'react';
import { DragEvent, MouseEvent, TouchEvent } from 'react';

import { observer } from 'mobx-react';
import { observable } from 'mobx';

import styles from './styles/brick.less';

// import BrickComponent from './brick';
import WorkspaceStore from './store';

import { get_global_offset } from './util';
import Input from './dummy/input';
import Select from './dummy/select';
import {
  AtomicBrickEnum,
  Brick,
  BrickOutput,
  BrickId,
  BrickDragEvent,
} from './types';

const is_container = (brick) => brick.type === 'container';

@observer
export class RootBrickComponent extends Component<{
  data: Brick,
  store: WorkspaceStore,
}, {}> {
  constructor(props) {
    super(props);
  }
  render() {
    const brick = this.props.data;
    const store = this.props.store;
    const id = brick.id;
    return <div className={styles.root_brick} style={brick.ui && brick.ui.offset ? {
      left: brick.ui.offset.x,
      top: brick.ui.offset.y,
    } : {}}>
      <BrickComponent data={brick} store={store}/>
    </div>;
  }
}

@observer
class BrickComponent extends Component<{
  data: Brick,
  store: WorkspaceStore,
}, {}> {
  ref;
  constructor(props) {
    super(props);
    this.ref = React.createRef();
  }
  on_touch_start = (e: TouchEvent<HTMLElement>) => {
    e.stopPropagation();
    this.props.store.brick_on_drag_start(e, this.props.data, this.ref.current);
  }
  on_mouse_down = (e: MouseEvent<HTMLElement>) => {
    e.stopPropagation();
    this.props.store.brick_on_drag_start(e, this.props.data, this.ref.current);
  }
  on_context_menu = (e) => {
    e.stopPropagation();
    this.props.store.on_context_menu(e, this.props.data, this.ref.current);
  }
  render() {
    const brick = this.props.data;
    const store = this.props.store;
    let child;
    if (AtomicBrickEnum[brick.type]) {
      if (brick.type === 'atomic_text') {
        return <div key={brick.id} className={styles.atomicText}>{brick.ui.value[0] === ' ' ? <div className={styles.atomicTextIndent} /> : null}{brick.ui.value}</div>;
      }
      const basic_fns = {
        onChange: (value) => {
          if (brick.output === BrickOutput.number) {
            brick.ui.value = parseFloat(value) || 0;
          } else {
            brick.ui.value = value;
          }
          // store.root_bricks_on_change();
          return brick.ui.value;
        },
        show: (content, cb?) => {
          store.ui.mask.content = content;
          store.ui.mask.visibility = true;
        },
        hide: () => {
          store.ui.mask.visibility = false;
        },
      };
      const select_fns = {
        ...basic_fns,
        offset: () => {
          const offset = get_global_offset(this.ref.current);
          offset.y += 40;
          return offset;
        },
      };
      const input_fns = {
        ...basic_fns,
        offset: () => {
          const offset = get_global_offset(this.ref.current);
          offset.x++;
          offset.y++;
          return offset;
        },
      };
      const typeToInstance = {
        atomic_input_string: () => <Input
          value={brick.ui.value.toString()}
          {...input_fns}
          editing={store.ui.mask.visibility && store.active_brick === brick} />,
        atomic_input_number: () => typeToInstance.atomic_input_string(),
        atomic_dropdown: () => <Select value={brick.ui.value} options={store.atomic_dropdown_menu[brick.ui.dropdown]} {...select_fns} />,
        atomic_boolean: () => typeToInstance.atomic_dropdown(),
        atomic_button: () => <div key={brick.id} className={styles.atomicButtonWrap}><div className={brick.ui.className} onClick={(e) => {
          e.stopPropagation();
          store.atomic_button_fns[brick.ui.value](store, brick);
        }} /></div>,
        atomic_param: () => <div key={brick.id} className={styles.atomicParam}>{brick.ui.value}</div>,
      };
      child = typeToInstance[brick.type]();
    }

    const parts = brick.parts && brick.parts.length && brick.parts.map(i => <BrickComponent key={i.id} data={i} store={store}/>);
    const inputs = brick.inputs && brick.inputs.length && brick.inputs.map(i => <BrickComponent key={i.id} data={i} store={store}/>);
    const next = brick.next && <BrickComponent key={brick.next.id} data={brick.next} store={store}/>;
    const active = brick === store.active_brick;
    const class_name = `${styles.wrap} ${brick.output ? `${styles.output} ${styles[BrickOutput[brick.output]]}` : ''} ${brick.ui.is_removing ? styles.removing : ''} ${is_container(brick) ? styles.container : ''}  ${brick.ui.is_ghost ? styles.ghost : ''} ${active ? styles.active : ''}`;
    const events = {
      onTouchStart: this.on_touch_start,
      onMouseDown: this.on_mouse_down,
      onContextMenu: this.on_context_menu,
    };
    return (
      <div
        className={class_name}
        ref={this.ref}
        key={brick.id}
        {...child ? events : {}}
        style={{
          marginLeft: `${brick.ui.offset && brick.ui.offset.x || 0}px`,
          marginTop: `${brick.ui.offset && brick.ui.offset.y || 0}px`,
        }}
      >
        {parts ? <div className={styles.parts}>
          {parts}
        </div> : null}
        {inputs ? <div
          {...events}
          className={`${styles.inputs} ${brick.ui.show_hat ? styles.hat : ''}`}
        >
          {inputs}
        </div> : null}
        {next ? <div className={styles.next}>
          {next}
        </div> : null}
        {child}
      </div>
    );
  }
}