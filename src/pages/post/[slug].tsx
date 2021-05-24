import { GetStaticPaths, GetStaticProps } from 'next';
import { FiCalendar, FiUser, FiClock } from 'react-icons/fi';
import Head from 'next/head';
import Prismic from '@prismicio/client';
import { useRouter } from 'next/router';
import { RichText } from 'prismic-dom';

import format from 'date-fns/format';
import ptBR from 'date-fns/locale/pt-BR';
import { getPrismicClient } from '../../services/prismic';

import commonStyles from '../../styles/common.module.scss';
import styles from './post.module.scss';

interface Post {
  first_publication_date: string | null;
  uid: string;
  data: {
    title: string;
    subtitle: string;
    banner: {
      url: string;
    };
    author: string;
    content: {
      heading: string;
      body: {
        text: string;
      }[];
    }[];
  };
}

interface PostProps {
  post: Post;
}

export default function Post({ post }: PostProps): React.ReactElement {
  const router = useRouter();

  if (router.isFallback) {
    return <div>Carregando...</div>;
  }

  const { content } = post.data;

  const htmlContent = content.reduce(
    (html, itemContent) =>
      html +
      RichText.asHtml(itemContent.heading) +
      RichText.asHtml(itemContent.body),
    ''
  );

  const textContent = content.reduce(
    (text, itemContent) =>
      text +
      RichText.asText(itemContent.heading) +
      RichText.asText(itemContent.body),
    ''
  );

  const timeToRead = (textContent.split(' ').length * 0.4) / 60;

  return (
    <>
      <Head>
        <title>{post.data.title} </title>
      </Head>
      {post.data.banner && (
        <img
          className={styles.banner}
          src={post.data.banner.url}
          alt="banner"
        />
      )}
      <main className={styles.container}>
        <h1>{post.data.title}</h1>
        <div className={styles.icons}>
          <time className={commonStyles.iconText}>
            <FiCalendar />
            {format(new Date(post.first_publication_date), 'dd MMM yyyy', {
              locale: ptBR,
            })}
          </time>
          <span className={commonStyles.iconText}>
            <FiUser />
            {post.data.author}
          </span>
          <span className={commonStyles.iconText}>
            <FiClock />
            {timeToRead.toFixed()} min
          </span>
        </div>
        <div className={styles.content}>
          <div
            className={styles.post}
            dangerouslySetInnerHTML={{ __html: htmlContent }}
          />
        </div>
      </main>
    </>
  );
}

export const getStaticPaths: GetStaticPaths = async () => {
  const prismic = getPrismicClient();

  const resp = prismic.query([Prismic.predicates.at('document.type', 'post')], {
    pageSize: 20,
  });

  const slugs = resp.then(post =>
    post.results.map(_post => ({ params: { slug: _post.uid } }))
  );

  return {
    paths: [...(await slugs.then(slug => slug))],
    fallback: true,
  };
};

export const getStaticProps: GetStaticProps = async context => {
  const prismic = getPrismicClient();
  const { slug } = context.params;

  const response = await prismic.getByUID('post', String(slug), {});

  const post = {
    first_publication_date: response.first_publication_date,
    uid: response.uid,
    data: {
      title: response.data.title,
      subtitle: response.data.subtitle,
      banner: {
        url: response.data.banner.url,
      },
      author: response.data.author,
      content: response.data.content,
    },
  };

  return {
    props: {
      post,
    },
    revalidate: 60 * 30, // 30 minutes
  };
};
